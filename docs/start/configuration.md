---
title: Configuration
---

While Strapi dutifully adheres to the philosophy of convention-over-configuration, it is important to understand how to customize those handy defaults from time to time. For almost every convention in Strapi, there is an accompanying set of configuration options that allow you to adjust or override things to fit your needs.

Settings specified at the root directory will be available in all environments.

If you'd like to have some settings take effect only in certain environments, you can use the special environment-specific files and folders. Any files saved under the `./config/environments/development` directory will be loaded only when Strapi is started in the `development` environment.

The built-in meaning of the settings in `strapi.config` are, in some cases, only interpreted by Strapi during the `start` process. In other words, changing some options at runtime will have no effect. To change the port your application is running on, for instance, you can't just change `strapi.config.port`. You'll need to change the setting, then restart the server.

## Host

The host name the connection was configured to.

Configuration:

- Key: `host`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `string`

Example:

```js
{
  "host": "localhost"
}
```

Notes:

- You don't need to specify a `host` in a `production` environment.
- Defaults to the operating system hostname when available, otherwise `localhost`.

## Port

The actual port assigned after the server has been started.

Configuration:

- Key: `port`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `integer`

Example:

```js
{
  "port": 1337
}
```

Notes:

- You don't need to specify a `host` in a `production` environment.
- When no port is configured or set, Strapi will look for the `process.env.PORT` value. If no port specified, the port will be `1337`.
