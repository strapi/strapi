# Configuration

While Strapi dutifully adheres to the philosophy of convention-over-configuration, it is important to understand how to customize those handy defaults from time to time. For almost every convention in Strapi, there is an accompanying set of configuration options that allow you to adjust or override things to fit your needs.

Settings specified at the root directory will be available in all environments.

!!! note
    If you'd like to have some settings take effect only in certain environments, you can use the special environment-specific files and folders. Any files saved under the `./config/environments/development` directory will be loaded only when Strapi is started in the `development` environment.

!!! warning
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

## Public assets

Strapi is compatible with any front-end strategy; whether it's Angular, Backbone, Ember, iOS, Android, Windows Phone, or something else that hasn't been invented yet.

!!! note
    Public assets refer to static files on your server that you want to make accessible to the outside world. In Strapi, these files are placed in the `./public` directory.

Configuration:

- Key: `static`
- Environment: all
- Location: `./config/general.json`
- Type: `boolean`

Example:

```js
{
  "static": true
}
```

Notes:

- Set to `false` to disable the public assets.

## Body parser

The "body parser" extracts the entire body portion of an incoming request stream and exposes it as something easier to interface with. It will most likely do what you want and save you the trouble.

Configuration:

- Key: `parser`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `object`

Example:

```js
{
  "parser": {
    "encode": "utf-8",
    "formLimit": "56kb",
    "jsonLimit": "1mb",
    "strict": true,
    "extendTypes": {
      "json": [
        "application/x-javascript"
      ]
    }
  }
}
```

Options:

- `encode` (string): Requested encoding.
- `formLimit` (string): Limit of the urlencoded body. If the body ends up being larger than this limit, a 413 error code is returned.
- `jsonLimit` (string): Limit of the JSON body.
- `strict` (boolean): When set to `true`, JSON parser will only accept arrays and objects.
- `extendTypes` (array): Support extend types.

Notes:

- Set to `false` to disable the body parser (not recommended).

## Favicon

A favicon is a file containing one small icon, most commonly 16×16 pixels, for your website.

Configuration:

- Key: `favicon`
- Environment: all
- Location: `./config/general.json`
- Type: `object`

Example:

```js
{
  "favicon": {
    "path": "favicon.ico",
    "maxAge": 86400000
  }
}
```

Options:

- `path` (string): Relative path for the favicon to use from the application root directory.
- `maxAge` (integer): Cache-control max-age directive. Set to pass the cache-control in ms.

Notes:

- Set to `false` to disable the favicon feature.

## Gzip

Compression is a simple, effective way to save bandwidth and speed up your site.

Gzip performs best on text-based assets: CSS, JavaScript, HTML. All modern browsers support Gzip compression and will automatically request it.

The best part is that enabling Gzip is one of the simplest and highest payoff optimizations to implement-- sadly, many people still forget to implement it.

Configuration:

- Key: `gzip`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `boolean`

Example:

```js
{
  "gzip": true
}
```

Notes:

- Set to `false` to disable Gzip compression.

## Response time

The `X-Response-Time` header records the response time for requests in HTTP servers. The response time is defined here as the elapsed time from when a request enters the application to when the headers are written out to the client.

Configuration:

- Key: `responseTime`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `boolean`

Example:

```js
{
  "responseTime": true
}
```

Notes:

- Set to `false` to disable the response time header.

## Logging

Strapi comes with a simple and useful built-in logger. Its usage is purposely very similar to `console.log()`, but with a handful of extra features; namely support for multiple log levels with colorized, prefixed console output.

Configuration:

- Key: `logger`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `boolean`

Example:

```js
{
  "logger": true
}
```

Notes:

- Set to `false` to disable the lifecyle and request logs.
