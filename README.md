# State Storage for Bot Framework using Mysql

This project provides a Mysql storage mechanism for [Bot Framework-JS SDK V4](https://github.com/Microsoft/botbuilder-js).

It allows you to store bot state in Mysql, so that you can scale out your bot, and be more resilient to bot server failures.

For more information about the botbuilder community, please visit [the botbuilder community project](https://github.com/BotBuilderCommunity/botbuilder-community-js).

## Requirements

-   [NodeJS](https://nodejs.org/en/) 10.x is a requirement to install dependencies, build and run tests.
-   Mysql database.

## Installation

```bash
npm install @dark_insider/botbuilder-storage-mysql
```

## Sample Usage

```JavaScript
const mysqlStorage = new MysqlStorage({
  uri : process.env.MYSQL_URI
});

const conversationState = new ConversationState(mysqlStorage);
```

Where `MYSQL_URI` is set in `.env` 

`mysql://<username>:<password>@<host>:<port>/<db_name>`


## Configuration Options

| Field        | Description                                                    | Value      |
| ------------ | -------------------------------------------------------------- | ---------- |
| `uri`        | The Mysql connection URI                                    | _Required_ |
| `collection` | The name you'd like given to the table the bot will reference. | _Optional_ |
| `logging`    | Whether or not you want logging of transactions enabled.       | _Optional_ |

> &#X26A0; Caution: you **should not store mysql URI in code!** Get the `uri` from a configuration such as environment variable, or a secrets store in your environment. It may contain a sensitive password in the clear and should **never be stored in code**!

---

\*

-   botbuilder-storage-mysql
-   Copyright 2021 DarkInsider. Released under the terms of the MIT license.
-   ***
