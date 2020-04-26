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

To activate and configure your hook with custom options, you need to edit your `./config/environments/**/middleware.json` file in your Strapi app.

By default this file doesn't exist, you will have to create it.

```javascript
{
  ...
  "middleware-name": {
    "enabled": true,
    ...
  }
}
```

## Core middlewares

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

### Load order

The middlewares are injected into the Koa stack asynchronously. Sometimes it happens that some of these middlewares need to be loaded in a specific order. To define a load order, we created a dedicated file located in `./config/middleware.json`.

**Path —** `./config/middleware.json`.

```json
{
  "timeout": 100,
  "load": {
    "before": ["responseTime", "logger", "cors", "responses"],
    "order": [
      "Define the middlewares' load order by putting their name in this array in the right order"
    ],
    "after": ["parser", "router"]
  }
}
```

- `timeout`: Defines the maximum allowed milliseconds to load a middleware.
- `load`:
  - `before`: Array of middlewares that need to be loaded in the first place. The order of this array matters.
  - `order`: Array of middlewares that need to be loaded in a specific order.
  - `after`: Array of middlewares that need to be loaded at the end of the stack. The order of this array matters.

### Examples

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

**Path —** `config/environments/**/middleware.json`.

```json
{
  "timer": {
    "enabled": true
  }
}
```

Load a middleware at the very first place

**Path —** `./config/middleware.json`

```json
{
  "timeout": 100,
  "load": {
    "before": ["timer", "responseTime", "logger", "cors", "responses", "gzip"],
    "order": [
      "Define the middlewares' load order by putting their name in this array is the right order"
    ],
    "after": ["parser", "router"]
  }
}
```
