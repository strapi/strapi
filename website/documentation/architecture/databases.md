# Databases

!!! note
    The Strapi philosophy regarding databases and ORMs is very simple: a unique ORM for SQL databases and one selected ORM for each NoSQL database.

!!! important
    We unfortunately don't provide hooks for NoSQL databases yet. [Join us on Slack](http://slack.strapi.io) to see how we can work together if you are interested in helping us about this.

A connection represents a particular database configuration. This configuration object includes a `client` to use, as well as information like the `host`, `port`, `username`, `password`, and so forth.

Connections are defined in the `databases.json` of each environment.

## Client

The `client` parameter is required and determines which client adapter will be used with the library.

The following SQL databases are supported:

- SQLite (client: `sqlite3`)
- MySQL (clients: `mysql` or `mysql2`)
- MariaDB (client: `mariasql`)
- PostgreSQL (client: `pg`)
- Oracle (clients: `oracle` or `strong-oracle`)
- Microsoft SQL Server (client: `mssql`)
- WebSQL (client: `websql`)

Example:

```js
{
  "connections": {
    "default": {
      "client": "pg"
    }
  }
}
```

## Connection info

The connection options are passed directly to the appropriate database client to create the connection.

Example:

```js
{
  "connections": {
    "default": {
      "client": "pg",
      "connection": {
        "host": "127.0.0.1",
        "user": "username",
        "password": "password",
        "database": "myApp"
      }
    }
  }
}
```

Notes:

- If your database doesn't require a `password` simply delete the password property.
- The only key possible for SQLite is a `filename`.

## Debugging

Passing a flag on your initialization object will turn on debugging for all queries.

Example:

```js
{
  "connections": {
    "client": "pg",
    "connection": {
      "host": "127.0.0.1",
      "user": "username",
      "password": "password",
      "database": "myApp"
    },
    "default": {
      "debug": true
    }
  }
}
```

## Pooling

The client created by the configuration initializes a connection pool.

This connection pool has a default setting of a `min` at `2` and a `max` at `10` for the MySQL and PostgreSQL libraries, and a single connection for SQLite (due to issues with utilizing multiple connections on a single file).

To change the config settings for the pool, pass a `pool` option as one of the keys in the initialize block.

Example:

```js
{
  "connections": {
    "default": {
      "client": "pg",
      "connection": {
        "host": "127.0.0.1",
        "user": "username",
        "password": "password",
        "database": "myApp"
      },
      "default": {
        "debug": true
      },
      "pool": {
        "min": 3,
        "max": 14
      }
    }
  }
}
```

Notes:

- You simply need to remove the `pool` object when you use SQLite.

## Connection timeout

`acquireConnectionTimeout` defaults to `60000`ms and is used to determine how long Strapi should wait before throwing a timeout error when acquiring a connection is not possible.

The most common cause for this is using up all the pool for transaction connections and then attempting to run queries outside of transactions while the pool is still full. The error thrown will provide information on the query the connection was for to simplify the job of locating the culprit.

Example:

```js
{
  "connections": {
    "default": {
      "client": "pg",
      "connection": {
        "host": "127.0.0.1",
        "user": "username",
        "password": "password",
        "database": "myApp"
      },
      "default": {
        "debug": true
      },
      "pool": {
        "min": 3,
        "max": 14
      },
      "acquireConnectionTimeout": 10000
    }
  }
}
```

## Migrations

For convenience, the migration table name may be specified when configuring the connection.

By default, the table name used for migrations is `migrations`.

Example:

```js
{
  "connections": {
    "default": {
      "client": "pg",
      "connection": {
        "host": "127.0.0.1",
        "user": "username",
        "password": "password",
        "database": "myApp"
      },
      "default": {
        "debug": true
      },
      "pool": {
        "min": 3,
        "max": 14
      },
      "acquireConnectionTimeout": 10000,
      "migrations": {
        "tableName": "updates"
      }
    }
  }
}
```
