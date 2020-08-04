# Middlewares

The middlewares are functions which are composed and executed in a stack-like manner upon request. If you are not familiar with the middleware stack in Koa, we highly recommend you to read the [Koa's documentation introduction](http://koajs.com/#introduction).

## Structure

### File structure

```js
module.exports = strapi => {
  return {
    // can also be async
    initialize() {
      strapi.app.use(async (ctx, next) => {
        // await someAsyncCode()

        await next();

        // await someAsyncCode()
      });
    },
  };
};
```

- `initialize` (function): Called during the server boot.

The middlewares are accessible through the `strapi.middleware` variable.

### Node modules

Every folder that follows this name pattern `strapi-middleware-*` in your `./node_modules` folder will be loaded as a middleware.

A middleware needs to follow the structure below:

```
/middleware
└─── lib
     - index.js
- LICENSE.md
- package.json
- README.md
```

The `index.js` is the entry point to your middleware. It should look like the example above.

### Custom middlewares

The framework allows the application to override the default middlewares and add new ones. You have to create a `./middlewares` folder at the root of your project and put the middlewares into it.

```
/project
└─── api
└─── config
└─── middlewares
│   └─── responseTime // It will override the core default responseTime middleware.
│        - index.js
│   └─── views // It will be added into the stack of middleware.
│        - index.js
└─── public
- favicon.ico
- package.json
- server.js
```

Every middleware will be injected into the Koa stack. To manage the load order, please refer to the [Middleware order section](#load-order).

## Configuration and activation

To configure the middlewares of your application, you need to create or edit the `./config/middleware.js` file in your Strapi app.

By default this file doesn't exist, you will have to create it.

**Availabe options**

- `timeout` (integer): Defines the maximum allowed milliseconds to load a middleware.
- `load` (Object): Configuration middleware loading. See details [here](#load-order)
- `settings` (Object): Configuration of each middleware
  - `{middlewareName}` (Object): Configuration of one middleware
    - `enabled` (boolean): Tells Strapi to run the middleware or not

### Settings

**Example**:

**Path —** `./config/middleware.js`.

```js
module.exports = {
  //...
  settings: {
    cors: {
      origin: 'http://localhost',
    },
  },
};
```

### Load order

The middlewares are injected into the Koa stack asynchronously. Sometimes it happens that some of these middlewares need to be loaded in a specific order. To define a load order, create or edit the file `./config/middleware.js`.

**Path —** `./config/middleware.js`.

```js
module.exports = {
  load: {
    before: ['responseTime', 'logger', 'cors', 'responses'],
    order: [
      "Define the middlewares' load order by putting their name in this array in the right order",
    ],
    after: ['parser', 'router'],
  },
};
```

- `load`:
  - `before`: Array of middlewares that need to be loaded in the first place. The order of this array matters.
  - `order`: Array of middlewares that need to be loaded in a specific order.
  - `after`: Array of middlewares that need to be loaded at the end of the stack. The order of this array matters.

## Core middleware configurations

The core of Strapi embraces a small list of middlewares for performances, security and great error handling.

- boom
- cors
- cron
- csp
- favicon
- gzip
- hsts
- ip
- language
- logger
- p3p
- parser
- public
- responses
- responseTime
- router
- session
- xframe
- xss

::: tip
The following middlewares cannot be disabled: responses, router, logger and boom.
:::

### Global middlewares

- `favicon`
  - `path` (string): Path to the favicon file. Default value: `favicon.ico`.
  - `maxAge` (integer): Cache-control max-age directive in ms. Default value: `86400000`.
- `public`
  - `path` (string): Path to the public folder. Default value: `./public`.
  - `maxAge` (integer): Cache-control max-age directive in ms. Default value: `60000`.
  - `defaultIndex` (boolean): Display default index page at `/` and `/index.html`. Default value: `true`.

### Request middlewares

- `session`
  - `enabled` (boolean): Enable or disable sessions. Default value: `false`.
- `logger`
  - `level` (string): Default log level. Default value: `debug`.
  - `exposeInContext` (boolean): Expose logger in context so it can be used through `strapi.log.info(‘my log’)`. Default value: `true`.
  - `requests` (boolean): Enable or disable requests logs. Default value: `false`.
- `parser` (See [koa-body](https://github.com/dlau/koa-body#options) for more information)
  - `enabled`(boolean): Enable or disable parser. Default value: `true`.
  - `multipart` (boolean): Enable or disable multipart bodies parsing. Default value: `true`.
  - `jsonLimit` (string|integer): The byte (if integer) limit of the JSON body. Default value: `1mb`.
  - `formLimit` (string|integer): The byte (if integer) limit of the form body. Default value: `56k`.

::: tip
The session doesn't work with `mongo` as a client. The package that we should use is broken for now.
:::

### Response middlewares

- [`gzip`](https://en.wikipedia.org/wiki/Gzip)
  - `enabled` (boolean): Enable or not GZIP response compression.
- `responseTime`
  - `enabled` (boolean): Enable or not `X-Response-Time header` to response. Default value: `false`.
- `poweredBy`
  - `enabled` (boolean): Enable or not `X-Powered-By` header to response. Default value: `true`.
  - `value` (string): The value of the header. Default value: `Strapi <strapi.io>`

### Security middlewares

- [`csp`](https://en.wikipedia.org/wiki/Content_Security_Policy)
  - `enabled` (boolean): Enable or disable CSP to avoid Cross Site Scripting (XSS) and data injection attacks.
  - `policy` (string): Configures the `Content-Security-Policy` header. If not specified uses default value. Default value: `undefined`.
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
  - `origin` (string): Allowed URLs (`http://example1.com, http://example2.com` or allows everyone `*`). Default value: `*`.
  - `expose` (array): Configures the `Access-Control-Expose-Headers` CORS header. If not specified, no custom headers are exposed. Default value: `["WWW-Authenticate", "Server-Authorization"]`.
  - `maxAge` (integer): Configures the `Access-Control-Max-Age` CORS header. Default value: `31536000`.
  - `credentials` (boolean): Configures the `Access-Control-Allow-Credentials` CORS header. Default value: `true`.
  - `methods` (array)|String - Configures the `Access-Control-Allow-Methods` CORS header. Default value: `["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]`.
  - `headers` (array): Configures the `Access-Control-Allow-Headers` CORS header. If not specified, defaults to reflecting the headers specified in the request's Access-Control-Request-Headers header. Default value: `["Content-Type", "Authorization", "X-Frame-Options"]`.
- `ip`
  - `enabled` (boolean): Enable or disable IP blocker. Default value: `false`.
  - `whiteList` (array): Whitelisted IPs. Default value: `[]`.
  - `blackList` (array): Blacklisted IPs. Default value: `[]`.

## Example

Create your custom middleware.

**Path —** `./middlewares/timer/index.js`

```js
module.exports = strapi => {
  return {
    initialize() {
      strapi.app.use(async (ctx, next) => {
        const start = Date.now();

        await next();

        const delta = Math.ceil(Date.now() - start);

        ctx.set('X-Response-Time', delta + 'ms');
      });
    },
  };
};
```

Enable the middleware in environments settings.

Load a middleware at the very first place

**Path —** `./config/middleware.js`

```js
module.exports = {
  load: {
    before: ['timer', 'responseTime', 'logger', 'cors', 'responses', 'gzip'],
    order: [
      "Define the middlewares' load order by putting their name in this array is the right order",
    ],
    after: ['parser', 'router'],
  },
  settings: {
    timer: {
      enabled: true,
    },
  },
};
```
