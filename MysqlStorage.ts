import { Storage, StoreItems } from 'botbuilder';
import {
  Sequelize, Model, DataTypes, Op,
} from 'sequelize';

export interface MysqlStorageConfig {
  uri: string;
  collection?: string;
  logging?: boolean | ((sql: string, timing?: number) => void);
}

class MysqlStoreItem extends Model {
  public id!: number;

  public data!: JSON;
}

export class MysqlStorageError extends Error {
  public static readonly NO_CONFIG_ERROR: MysqlStorageError = new MysqlStorageError(
    'MysqlStorageConfig is required.',
  );

  public static readonly NO_URI_ERROR: MysqlStorageError = new MysqlStorageError(
    'MysqlStorageConfig.uri is required.',
  );
}

interface IMysqlStoreItem {
  id: number;
  data: JSON;
}

export class MysqlStorage implements Storage {
  private config: MysqlStorageConfig;

  private connection: Sequelize | undefined;

  static readonly DEFAULT_COLLECTION_NAME: string = 'state';

  constructor(config: MysqlStorageConfig) {
    this.config = MysqlStorage.ensureConfig({ ...config });
  }

  public static ensureConfig(
    config: MysqlStorageConfig,
  ): MysqlStorageConfig {
    if (!config) {
      throw MysqlStorageError.NO_CONFIG_ERROR;
    }

    if (!config.uri || config.uri.trim() === '') {
      throw MysqlStorageError.NO_URI_ERROR;
    }

    if (!config.collection || config.collection.trim() === '') {
      config.collection = MysqlStorage.DEFAULT_COLLECTION_NAME;
    }

    return config as MysqlStorageConfig;
  }

  public async connect(): Promise<Sequelize> {
    const sequelize = new Sequelize(this.config.uri, {
      // ...options
      dialect: 'mysql',
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      logging: this.config.logging,
    });
    await MysqlStoreItem.init(
      {
        id: {
          type: DataTypes.STRING(500),
          primaryKey: true,
        },
        data: {
          type: DataTypes.JSON,
          allowNull: false,
        },
      },
      { sequelize, tableName: this.config.collection, timestamps: false },
    );
    await MysqlStoreItem.sync();
    this.connection = sequelize;
    return this.connection;
  }

  public async ensureConnected(): Promise<Sequelize | undefined> {
    if (!this.connection) {
      await this.connect();
    }
    return this.connection;
  }

  public async read(stateKeys: string[]): Promise<StoreItems> {
    if (!stateKeys || stateKeys.length === 0) {
      return {};
    }
    await this.ensureConnected();

    const items = await MysqlStoreItem.findAll({
      where: { id: { [Op.in]: stateKeys } },
    });
    return items.reduce((accum: any, item): StoreItems => {
      // eslint-disable-next-line no-param-reassign
      accum[item.id] = item.data;
      return accum;
    }, {});
  }

  public async write(changes: StoreItems): Promise<void> {
    if (!changes || Object.keys(changes).length === 0) {
      return;
    }

    await this.ensureConnected();

    async function asyncForEach(
      array: any[],
      callback: {
          (key: string): Promise<void>;
          (arg0: any, arg1: number, arg2: any[]): void;
        },
    ) {
      for (let index: number = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    }

    const writeAsync = async () => {
      await asyncForEach(
        Object.keys(changes),
        async (key: string): Promise<void> => {
          const query = `INSERT INTO ${MysqlStoreItem.tableName} (id, data) 
        VALUES (:id, :data) 
        ON DUPLICATE KEY UPDATE data = :data`;
          // @ts-ignore
          await this.connection.query(query, {
            replacements: {
              id: key,
              data: JSON.stringify(changes[key]),
            },
          });
        },
      );
    };

    writeAsync();
  }

  public async delete(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) {
      return;
    }
    await this.ensureConnected();
    await MysqlStoreItem.destroy({ where: { id: { [Op.in]: keys } } });
  }

  //   public static shouldSlam(etag: string): boolean {
  //     return etag === "*" || !etag;
  //   }

  public static randHex(n: number): number | null {
    if (n <= 0) {
      return null;
    }
    let rs: number = 0;
    try {
      rs = Math.ceil(n / 2);
      /* note: could do this non-blocking, but still might fail */
    } catch (ex) {
      rs += Math.random();
    }
    return rs;
  }

  //   public static createFilter(key: string, etag: any): object {
  //     if (this.shouldSlam(etag)) {
  //       return { id: key };
  //     }
  //     return { id: key, "state.eTag": etag };
  //   }

  get Sequelize(): Sequelize {
    return <Sequelize> this.connection;
  }

  public async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      delete this.connection;
    }
  }
}