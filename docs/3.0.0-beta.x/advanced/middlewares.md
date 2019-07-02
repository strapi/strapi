# Middlewares

The middlewares are functions which are composed and executed in a stack-like manner upon request. If you are not familiar with the middleware stack in Koa, we highly recommend you to read the [Koa's documentation introduction](http://koajs.com/#introduction).

Enable the middleware in environments settings

**Path —** `config/environments/middleware.json`.

```json
{
  "responseTime": {
    "enabled": true
  }
}
```

**Path —** [`strapi/lib/middlewares/responseTime/index.js`](https://github.com/strapi/strapi/blob/master/packages/strapi/lib/middlewares/responseTime/index.js).

```js
module.exports = strapi => {
  return {
    // can also be async
    initialize() {
      strapi.app.use(async (ctx, next) => {
        const start = Date.now();

        await next();

        const delta = Math.ceil(Date.now() - start);

        // Set X-Response-Time header
        ctx.set('X-Response-Time', delta + 'ms');
      });
    },
  };
};
```

- `initialize` (function): Called during the server boot.

The core of Strapi embraces a small list of middlewares for performances, security and great error handling.

- boom
- cors
- cron
- csp
- csrf
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

::: note
The following middlewares cannot be disabled: responses, router, logger and boom.
:::

## Structure

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

## Custom middlewares

The framework allows the application to override the default middlewares and add new ones. You have to create a `./middlewares` folder at the root of your project and put the middlewares into it.

```
/project
└─── api
└─── config
└─── middlewares
│   └─── responseTime // It will override the core default responseTime middleware
│        - index.js
│   └─── views // It will be added into the stack of middleware
│        - index.js
└─── public
- favicon.ico
- package.json
- server.js
```

Every middleware will be injected into the Koa stack. To manage the load order, please refer to the [Middleware order section](#load-order).

## Load order

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

- `timeout`: defines the maximum allowed milliseconds to load a middleware.
- `load`:
  - `before`: array of middlewares that need to be loaded in the first place. The order of this array matters.
  - `order`: array of middlewares that need to be loaded in a specific order.
  - `after`: array of middlewares that need to be loaded at the end of the stack. The order of this array matters.

#### Examples

**Load a middleware at the very first place**

**Path —** `./config/middleware.json`

```json
{
  "timeout": 100,
  "load": {
    "before": ["responseTime", "logger"],
    "order": [],
    "after": []
  }
}
```

The `responseTime` middleware will be loaded first. Immediately followed by the `logger` middleware. Then, the others middlewares will be loaded asynchronously.

**Load a middleware after another one**

**Path —** `./config/middleware.json`.

```json
{
  "timeout": 100,
  "load": {
    "before": [],
    "order": ["p3p", "gzip"],
    "after": []
  }
}
```

The `gzip` middleware will be loaded after the `p3p` middleware. All the others will be loaded asynchronously.

**Load a middleware at the very end**

**Path —** `./config/middleware.json`.

```json
  {
    "timeout": 100,
    "load": {
      "before": [
        ...
      ],
      "order": [],
      "after": [
        "parser",
        "router"
      ]
    }
  }
```

The `router` middleware will be loaded at the very end. The `parser` middleware will be loaded after all the others and just before the `router` middleware.

**Complete example**

For this example, we are going to imagine that we have 10 middlewares to load:

- cors
- cron
- favicon
- gzip
- logger
- p3p
- parser
- response
- responseTime
- router

We assume that we set the `./config/middleware.json` file like this:

```json
{
  "timeout": 100,
  "load": {
    "before": ["responseTime", "logger", "cors"],
    "order": ["p3p", "gzip"],
    "after": ["parser", "router"]
  }
}
```

Here is the loader order:

1. responseTime (loaded at the very first place)
2. logger
3. cors
4. favicon (position order not guarantee)
5. p3p
6. cron
7. gzip (loaded after the p3p middlewares)
8. response (position order not guarantee)
9. parser
10. router (loaded at the very end place)
