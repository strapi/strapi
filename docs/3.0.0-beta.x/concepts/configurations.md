---
sidebarDepth: 2
---

# Configuration

Your application configuration lives in the `config` folder. All the configuration files are loaded on startup and can be accessed through the configuration provider.

When you have a file `./config/server.js` with the following config:

```js
module.exports = {
  host: '0.0.0.0',
};
```

You can access it as

```js
strapi.config.get('server.host', 'defaultValueIfUndefined');
```

Nested keys are accessible with `dot-notation`.

:::tip NOTE
You can notice the filename is used as prefix to access the configurations.
:::

## Formats

You can either use `.js` or `.json` files to configure your application.

When using a `.js` you can either export an object:

```js
module.exports = {
  mySecret: 'someValue',
};
```

or a function returning a configuration object (recommended usage). The function will get access to the [`env` utility](#casting-environment-variables).

```js
module.exports = ({ env }) => {
  return {
    mySecret: 'someValue',
  };
};
```

## Environment variables

In most usecases you will have different configurations between your environments. For example: your database credentials.

Instead of writting those credentials into your configuration files, you can define those variables in a `.env` file at the root of your application.

**Example**

```
DATABASE_PASSWORD=acme
```

If you want to customize the path of the `.env` file to load you can set an environment variable called `ENV_PATH` before starting your application:

```sh
$ ENV_PATH=/absolute/path/to/.env npm run start
```

Now you can access those variables in your configuration files and application. You can use `process.env.{varName}` to access those variables anywhere.

In your configuration files you will have access to a `env` utility that allows defining defaults and casting values.

`config/database.js`

```js
module.exports = ({ env }) => ({
  connections: {
    default: {
      settings: {
        password: env('DATABASE_PASSWORD'),
      },
    },
  },
});
```

### Casting environment variables

```js
// Returns the env if defined without casting it
env('VAR', 'default');

// Cast to int (using parseInt)
env.int('VAR', 0);

// Cast to float (using parseFloat)
env.float('VAR', 3.14);

// Cast to boolean (check if the value is equal to 'true')
env.bool('VAR', true);

// Cast to js object (using JSON.parse)
env.json('VAR', { key: 'value' });

// Cast to an array (syntax: ENV_VAR=[value1, value2, value3] | ENV_VAR=["value1", "value2", "value3"])
env.array('VAR', [1, 2, 3]);

// Case to date (using new Date(value))
env.date('VAR', new Date());
```

## Environments

What if you need to specific static configurations for specific environments and using environement variables becomes tedious ?

Strapi configurations can also be created per environment in `./config/env/{env}/{filename}`. These configurations will be merged into the base ones defined in the `./config` folder.
The environment is based on the `NODE_ENV` environment variable (defaults to `development`).

When starting strapi with `NODE_ENV=production` it will load the configuration from `./config/*` and `./config/env/production/*`. Everything defined in the production config will override the default config.

In combination with environment variables this pattern becomes really powerfull:

**Example**

`./config/server.js`

```js
module.exports = {
  host: '127.0.0.1',
};
```

`./config/env/production/server.js`

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
});
```

When you start your application

```bash
yarn start
# uses host 127.0.0.0
```

```bash
NODE_ENV=production yarn start
# uses host 0.0.0.0
```

```bash
HOST=10.0.0.1 NODE_ENV=production yarn start
# uses host 10.0.0.1
```

## Server

**Path —** `./config/server.js`.

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
});
```

**Available options**

| Property                 | Description                                                                                                                                                 | Type          | Default     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| `host`                   | Host name                                                                                                                                                   | string        | `localhost` |
| `port`                   | Port on which the server should be running.                                                                                                                 | integer       | `1337`      |
| `emitErrors`             | Enable errors to be emitted to `koa` when they happen in order to attach custom logic or use error reporting services.                                      | boolean       |             |
| `proxy`                  | Proxy configuration                                                                                                                                         | Object        |             |
| `proxy.enabled`          | Enable proxy support such as Apache or Nginx.                                                                                                               | boolean       | `false`     |
| `proxy.ssl`              | Enable proxy SSL support.                                                                                                                                   | boolean       |             |
| `proxy.host`             | Host name your proxy service uses for Strapi.                                                                                                               | string        |             |
| `proxy.port`             | Port that your proxy service accepts connections on.                                                                                                        | integer       |             |
| `cron`                   | Cron configuration (powered by [`node-schedule`](https://github.com/node-schedule/node-schedule))                                                           | Object        |             |
| `cron.enabled`           | Enable or disable CRON tasks to schedule jobs at specific dates.                                                                                            | boolean       | `false`     |
| `admin`                  | Admin panel configuration                                                                                                                                   | Object        |             |
| `admin.autoOpen`         | Enable or disabled administration opening on start.                                                                                                         | boolean       | `true`      |
| `admin.path`             | Allow to change the URL to access the admin panel.                                                                                                          | string        | `/admin`    |
| `admin.watchIgnoreFiles` | Add custom files that should not be watched during development. See more [here](https://github.com/paulmillr/chokidar#path-filtering) (property `ignored`). | Array(string) | `[]`.       |
| `admin.build`            | Admin panel build configuration                                                                                                                             | Object        |             |
| `admin.build.backend`    | URL that the admin panel and plugins will request                                                                                                           | string        |             |

## Functions

The `./config/functions/` folder contains a set of JavaScript files in order to add dynamic and logic based configurations.

All functions that are exposed in this folder are accessible via `strapi.config.functions['fileName']();`

### Bootstrap

**Path —** `./config/functions/bootstrap.js`.

The `bootstrap` function is called at every server start. You can use it to add a specific logic at this moment of your server's lifecycle.

Here are some use cases:

- Create an admin user if there isn't one.
- Fill the database with some necessary data.
- Check that the database is up-and-running.
- Load some environment variables.

The bootstrap function can be synchronous or asynchronous.

**Synchronous**

```js
module.exports = () => {
  // some sync code
};
```

**Return a promise**

```js
module.exports = () => {
  return new Promise(/* some code */);
};
```

**Asynchronous**

```js
module.exports = async () => {
  await someSetup();
};
```

### CRON tasks

CRON tasks allow you to schedule jobs (arbitrary functions) for execution at specific dates, with optional recurrence rules. It only uses a single timer at any given time (rather than reevaluating upcoming jobs every second/minute).

This feature is powered by [`node-schedule`](https://www.npmjs.com/package/node-schedule) node modules. Check it for more information.

::: warning
Make sure the `enabled` cron config is set to `true` in `./config/server.js` file.
:::

The cron format consists of:

```
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    |
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)
```

To define a CRON job, add your logic like below:

**Path —** `./config/functions/cron.js`.

```js
module.exports = {
  /**
   * Simple example.
   * Every monday at 1am.
   */

  '0 0 1 * * 1': () => {
    // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
  },
};
```

### Database ORM customization

When present, they are loaded to let you customize your database connection instance, for example for adding some plugin, customizing parameters, etc.

:::: tabs

::: tab Mongoose

As an example, for using the `mongoose-simple-random` plugin for MongoDB, you can register it like this:

**Path —** `./config/functions/mongoose.js`.

```js
'use strict';

const random = require('mongoose-simple-random');

module.exports = (mongoose, connection) => {
  mongoose.plugin(random);
};
```

:::

::: tab Bookshelf

Another example would be using the `bookshelf-uuid` plugin for MySQL, you can register it like this:

**Path —** `./config/functions/bookshelf.js`.

```js
'use strict';

module.exports = (bookshelf, connection) => {
  bookshelf.plugin(require('bookshelf-uuid'));
};
```

:::

::::

## Database

This file lets you define database connections that will be used to store your application content.

You can find [supported database and versions](../installation/cli.html#databases) in the local installation process.

**Path —** `./config/database.js`.

:::: tabs

::: tab Bookshelf

- `defaultConnection` (string): Connection by default for models which are not related to a specific `connection`. Default value: `default`.
- `connections` List of all available connections.
  - `default`
    - `connector` (string): Connector used by the current connection. Will be `bookshelf`.
    - `settings` Useful for external session stores such as Redis.
      - `client` (string): Database client to create the connection. `sqlite` or `postgres` or `mysql`.
      - `host` (string): Database host name. Default value: `localhost`.
      - `port` (integer): Database port.
      - `database` (string): Database name.
      - `username` (string): Username used to establish the connection.
      - `password` (string): Password used to establish the connection.
      - `options` (object): List of additional options used by the connector.
      - `timezone` (string): Set the default behavior for local time. Default value: `utc` [Timezone options](https://www.php.net/manual/en/timezones.php).
      - `schema` (string): Set the default database schema. **Used only for Postgres DB.**
      - `ssl` (boolean): For ssl database connection.
    - `options` Options used for database connection.
      - `debug` (boolean): Show database exchanges and errors.
      - `autoMigration` (boolean): To disable auto tables/columns creation for SQL database.
      - `pool` Options used for database connection pooling. For more information look at [Knex's pool config documentation](https://knexjs.org/#Installation-pooling).
        - `min` (integer): Minimum number of connections to keep in the pool. Default value: `0`.
        - `max` (integer): Maximum number of connections to keep in the pool. Default value: `10`.
        - `acquireTimeoutMillis` (integer): Maximum time in milliseconds to wait for acquiring a connection from the pool. Default value: `2000` (2 seconds).
        - `createTimeoutMillis` (integer): Maximum time in milliseconds to wait for creating a connection to be added to the pool. Default value: `2000` (2 seconds).
        - `idleTimeoutMillis` (integer): Number of milliseconds to wait before destroying idle connections. Default value: `30000` (30 seconds).
        - `reapIntervalMillis` (integer): How often to check for idle connections in milliseconds. Default value: `1000` (1 second).
        - `createRetryIntervalMillis` (integer): How long to idle after a failed create before trying again in milliseconds. Default value: `200`.

:::

::: tab Mongoose

- `defaultConnection` (string): Connection by default for models which are not related to a specific `connection`. Default value: `default`.
- `connections` List of all available connections.
  - `default`
    - `connector` (string): Connector used by the current connection. Will be `mongoose`.
    - `settings` Useful for external session stores such as Redis.
      - `client` (string): Database client to create the connection. Will be `mongo`.
      - `host` (string): Database host name. Default value: `localhost`.
      - `port` (integer): Database port. Default value: `27017`.
      - `database` (string): Database name.
      - `username` (string): Username used to establish the connection.
      - `password` (string): Password used to establish the connection.
      - `uri` (string): This can overide all previous configurations - _optional_
    - `options` Options used for database connection.
      - `ssl` (boolean): For ssl database connection.
      - `debug` (boolean): Show database exchanges and errors.
      - `authenticationDatabase` (string): Connect with authentication.

:::

::::

#### Example

**Path —** `./config/database.js`.

:::: tabs

::: tab Postgres

```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'postgres',
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        username: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        schema: 'public',
      },
      options: {
        debug: true,
      },
    },
  },
});
```

:::

::: tab MySQL

```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'mysql',
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        username: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
      },
      options: {},
    },
  },
});
```

:::

::: tab SQLite

```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'sqlite',
        filename: env('DATABASE_FILENAME', '.tmp/data.db'),
      },
      options: {
        useNullAsDefault: true,
      },
    },
  },
});
```

:::

::: tab Mongo

```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'mongoose',
      settings: {
        client: 'mongo',
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 27017),
        database: env('DATABASE_NAME', 'strapi'),
        username: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
      },
      options: {
        authenticationDatabase: '',
        ssl: true,
      },
    },
  },
});
```

:::

::::

::: tip
Take a look at the [database's guide](../guides/databases.md) for more details.
:::

## Configuration in database

Configuration files are not multi server friendly. So we created a data store for config you will want to update in production.

### Get settings

- `environment` (string): Sets the environment you want to store the data in. By default it's current environment (can be an empty string if your config is environment agnostic).
- `type` (string): Sets if your config is for an `api`, `plugin` or `core`. By default it's `core`.
- `name` (string): You have to set the plugin or api name if `type` is `api` or `plugin`.
- `key` (string, required): The name of the key you want to store.

```js
// strapi.store(object).get(object);

// create reusable plugin store variable
const pluginStore = strapi.store({
  environment: strapi.config.environment,
  type: 'plugin',
  name: 'users-permissions',
});

await pluginStore.get({ key: 'grant' });
```

### Set settings

- `value` (any, required): The value you want to store.

```js
// strapi.store(object).set(object);

// create reusable plugin store variable
const pluginStore = strapi.store({
  environment: strapi.config.environment,
  type: 'plugin',
  name: 'users-permissions'
});

await pluginStore.set({
  key: 'grant',
  value: {
    ...
  }
});
```
