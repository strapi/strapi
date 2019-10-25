# Configurations

The main configurations of the project are located in the `./config` directory. Additional configs can be added in the `./api/**/config` folder of each API and plugin by creating JavaScript or JSON files.

::: note
Inside the `/config` folder, every folder will be parsed and injected into the global object `strapi.config`. Let's say, you added a folder named `credentials` with two files `stripe.json` and `paypal.json` into it. The content of these files will be accessible through `strapi.config.credentials.stripe` and `strapi.config.credentials.paypal`.
:::

## Application

Contains the main configurations relative to your project.

**Path —** `./config/application.json`.

```json
{
  "favicon": {
    "path": "favicon.ico",
    "maxAge": 86400000
  },
  "public": {
    "path": "./public",
    "maxAge": 60000
  }
}
```

- `favicon`
  - `path` (string): Path to the favicon file. Default value: `favicon.ico`.
  - `maxAge` (integer): Cache-control max-age directive in ms. Default value: `86400000`.
- `public`
  - `path` (string): Path to the public folder. Default value: `./public`.
  - `maxAge` (integer): Cache-control max-age directive in ms. Default value: `60000`.

## Custom

Add custom configurations to the project. The content of this file is available through the `strapi.config` object.

#### Example

**Path —** `./config/custom.json`.

```json
{
  "backendURL": "http://www.strapi.io",
  "mainColor": "blue"
}
```

These configurations are accessible through `strapi.config.backendURL` and `strapi.config.mainColor`.

## Functions

The `./config/functions/` folder contains a set of JavaScript files in order to add dynamic and logic based configurations.

All functions that are expose in this folder or in your `./config` folder are accessible via `strapi.config.functions['fileName']();`

### Bootstrap

**Path —** `./config/functions/bootstrap.js`.

The `bootstrap` function is called at every server start. You can use it to add a specific logic at this moment of your server's lifecycle.

Here are some use cases:

- Create an admin user if there isn't one.
- Fill the database with some necessary data.
- Check that the database is up-and-running.
- Load some envrionments variables.

The bootstrap function can be synchronous or asynchronous

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

**Be async**

```js
module.exports = async () => {
  await someSetup();
};
```

### CRON tasks

CRON tasks allow you to schedule jobs (arbitrary functions) for execution at specific dates, with optional recurrence rules. It only uses a single timer at any given time (rather than reevaluating upcoming jobs every second/minute).

::: note
Make sure the `enabled` cron config is set to `true` in `./config/environments/**/server.json` file.
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
    // Add your own logic here (eg. send a queue of email, create a database backup, etc.).
  },
};
```

### Database ORM customization

- **Path —** `./config/functions/bookshelf.js`.
- **Path —** `./config/functions/mongoose.js`.

When present, they are loaded to let you customize your database connection instance, for example for adding some plugin, customizing parameters, etc.

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "Mongoose" id="mongoose"

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

::: tab "Bookshelf" id="bookshelf"

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

## Environments

Most of the application's configurations are defined by environment. It means that you can specify settings for each environment (`development`, `production`, `test`, etc.).

::: note
You can access the config of the current environment through `strapi.config.currentEnvironment`.
:::

## Database

**Path —** `./config/environments/**/database.json`.

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "Bookshelf" id="bookshelf"

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
      - `timezone` (string): Set the default behavior for local time. Default value: `utc`.
      - `schema` (string): Set the default database schema. **Used only for Postgres DB**
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

::: tab "Mongoose" id="mongoose"

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
  - `options` Options used for database connection.
    - `ssl` (boolean): For ssl database connection.
    - `debug` (boolean): Show database exchanges and errors.
    - `authenticationDatabase` (string): Connect with authentication.

:::

::::

#### Example

**Path —** `./config/environments/**/database.json`.

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "Postgres" id="postgres"

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "bookshelf",
      "settings": {
        "client": "postgres",
        "host": "localhost",
        "port": 5432,
        "username": "${process.env.USERNAME}",
        "password": "${process.env.PASSWORD}",
        "database": "strapi",
        "schema": "public"
      },
      "options": {
        "debug": true
      }
    }
  }
}
```

:::

::: tab "MySQL" id="mysql"

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "bookshelf",
      "settings": {
        "client": "mysql",
        "host": "localhost",
        "port": 5432,
        "username": "strapi",
        "password": "root",
        "database": "strapi"
      },
      "options": {}
    }
  }
}
```

:::

::: tab "SQLite" id="sqlite"

```json
{
  "defaultConnection": "default",
  "connections": {
    "sqlite": {
      "connector": "bookshelf",
      "settings": {
        "client": "sqlite",
        "filename": ".tmp/data.db"
      },
      "options": {
        "useNullAsDefault": true
      }
    }
  }
}
```

:::

::: tab "Mongo" id="mongo"

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "mongoose",
      "settings": {
        "client": "mongo",
        "host": "localhost",
        "port": 27017,
        "database": "strapi",
        "username": "",
        "password": ""
      },
      "options": {
        "authenticationDatabase": "",
        "ssl": true
      }
    }
  }
}
```

:::

::::

::: note
Please refer to the [dynamic configurations section](#dynamic-configurations) to use global environment variable to configure the databases.
:::

::: note
Take a look at the [database's guide](../guides/databases.md) for more details.
:::

## Request

**Path —** `./config/environments/**/request.json`.

- `session`
  - `enabled` (boolean): Enable or disable sessions. Default value: `false`.
  - `client` (string): Client used to persist sessions. Default value: `redis`.
  - `settings`
    - `host` (string): Client host name. Default value: `localhost`.
    - `port` (integer): Client port. Default value: `6379`.
    - `database`(integer)|String - Client database name. Default value: `10`.
    - `password` (string): Client password. Default value: ``.
- `logger`
  - `level` (string): Default log level. Default value: `debug`.
  - `exposeInContext` (boolean): Expose logger in context so it can be used through `strapi.log.info(‘my log’)`. Default value: `true`.
  - `requests` (boolean): Enable or disable requests logs. Default value: `false`.
- `parser`
  - `enabled`(boolean): Enable or disable parser. Default value: `true`.
  - `multipart` (boolean): Enable or disable multipart bodies parsing. Default value: `true`.

::: note
The session doesn't work with `mongo` as a client. The package that we should use is broken for now.
:::

## Response

**Path —** `./config/environments/**/response.json`.

- [`gzip`](https://en.wikipedia.org/wiki/Gzip)
  - `enabled` (boolean): Enable or not GZIP response compression.
- `responseTime`
  - `enabled` (boolean): Enable or not `X-Response-Time header` to response. Default value: `false`.
- `poweredBy`
  - `enabled` (boolean): Enable or not `X-Powered-By` header to response. Default value: `true`.
  - `value` (string): The value of the header. Default value: `Strapi <strapi.io>`

## Security

**Path —** `./config/environments/**/security.json`.

- [`csp`](https://en.wikipedia.org/wiki/Content_Security_Policy)
  - `enabled` (boolean): Enable or disable CSP to avoid Cross Site Scripting (XSS) and data injection attacks.
- [`p3p`](https://en.wikipedia.org/wiki/P3P)
  - `enabled` (boolean): Enable or disable p3p.
- [`hsts`](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security)
  - `enabled` (boolean): Enable or disable HSTS.
  - `maxAge` (integer): Number of seconds HSTS is in effect. Default value: `31536000`.
  - `includeSubDomains` (boolean): Applies HSTS to all subdomains of the host. Default value: `true`.
- [`xframe`](https://en.wikipedia.org/wiki/Clickjacking)
  - `enabled` (boolean): Enable or disable `X-FRAME-OPTIONS` headers in response.
  - `value` (string): The value for the header, e.g. DENY, SAMEORIGIN or ALLOW-FROM uri. Default value: `SAMEORIGIN`.
- [`xss`](https://en.wikipedia.org/wiki/Cross-site_scripting)
  - `enabled` (boolean): Enable or disable XSS to prevent Cross Site Scripting (XSS) attacks in older IE browsers (IE8).
- [`cors`](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
  - `enabled` (boolean): Enable or disable CORS to prevent your server to be requested from another domain.
  - `origin` (string): Allowed URLs (`http://example1.com, http://example2.com` or allows everyone `*`). Default value: `http://localhost`.
  - `expose` (array): Configures the `Access-Control-Expose-Headers` CORS header. If not specified, no custom headers are exposed. Default value: `["WWW-Authenticate", "Server-Authorization"]`.
  - `maxAge` (integer): Configures the `Access-Control-Max-Age` CORS header. Default value: `31536000`.
  - `credentials` (boolean): Configures the `Access-Control-Allow-Credentials` CORS header. Default value: `true`.
  - `methods` (array)|String - Configures the `Access-Control-Allow-Methods` CORS header. Default value: `["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]`.
  - `headers` (array): Configures the `Access-Control-Allow-Headers` CORS header. If not specified, defaults to reflecting the headers specified in the request's Access-Control-Request-Headers header. Default value: `["Content-Type", "Authorization", "X-Frame-Options"]`.
- `ip`
  - `enabled` (boolean): Enable or disable IP blocker. Default value: `false`.
  - `whiteList` (array): Whitelisted IPs. Default value: `[]`.
  - `blackList` (array): Blacklisted IPs. Default value: `[]`.

## Server

**Path —** `./config/environments/**/server.json`.

- `host` (string): Host name. Default value: `localhost`.
- `port` (integer): Port on which the server should be running. Default value: `1337`.
- `emitErrors` (boolean): Enable errors to be emitted to `koa` when they happen in order to attach custom logic or use error reporting services.
- `proxy`
  - `enabled` (boolean): Enable proxy support such as Apache or Nginx. Default value: `false`.
  - `ssl` (boolean): Enable proxy SSL support
  - `host` (string): Host name your proxy service uses for Strapi.
  - `port` (integer): Port that your proxy service accepts connections on.
- [`cron`](https://en.wikipedia.org/wiki/Cron)
  - `enabled` (boolean): Enable or disable CRON tasks to schedule jobs at specific dates. Default value: `false`.
- `admin`
  - `autoOpen` (boolean): Enable or disabled administration opening on start (default: `true`)
  - `path` (string): Allow to change the URL to access the admin (default: `/admin`).
  - `build`
    - `backend` (string): URL that the admin panel and plugins will request (default: `http://localhost:1337`).

#### Example

**Path —** `./config/environments/**/server.json`.

As an example using this configuration with Nginx your server would respond to `https://example.com:8443` instead of `http://localhost:1337`

**Note:** you will need to configure Nginx or Apache as a proxy before configuring this example.

```json
{
  "host": "localhost",
  "port": 1337,
  "proxy": {
    "enabled": true,
    "ssl": true,
    "host": "example.com",
    "port": 8443
  },
  "cron": {
    "enabled": true
  }
}
```

## Dynamic configurations

For security reasons, sometimes it's better to set variables through the server environment. It's also useful to push dynamics values into configurations files. To enable this feature into JSON files, Strapi embraces a JSON-file interpreter into his core to allow dynamic value in the JSON configurations files.

### Syntax

The syntax is inspired by the [template literals ES2015 specifications](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals). These dynamic values are indicated by the Dollar sign and curly braces (`${expression}`).

#### Usage

In any JSON configurations files in your project, you can inject dynamic values like this:

**Path —** `./config/environments/production/database.json`.

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "mongoose",
      "settings": {
        "client": "mongo",
        "uri": "${process.env.DATABASE_URI || ''}",
        "host": "${process.env.DATABASE_HOST || '127.0.0.1'}",
        "port": "${process.env.DATABASE_PORT || 27017}",
        "database": "${process.env.DATABASE_NAME || 'production'}",
        "username": "${process.env.DATABASE_USERNAME || ''}",
        "password": "${process.env.DATABASE_PASSWORD || ''}"
      },
      "options": {}
    }
  }
}
```

::: note
You can't execute functions inside the curly braces. Only strings are allowed.
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
