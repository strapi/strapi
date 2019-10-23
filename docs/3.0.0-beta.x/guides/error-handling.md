# Error handling

In this guide we will see how you can handle errors to send it on the Application Monitoring / Error Tracking Software you want.

::: note
In this example we will use [Sentry](https://sentry.io).
:::

## Create a middleware

To handle errors, we will have to use a [middleware](../concepts/middlewares.md) that will catch errors and send them to Sentry.

- Create a `./middlewares/sentry/index.js` file.

**Path —** `./middlewares/sentry/index.js`

```js
module.exports = strapi => {
  return {
    initialize() {
      strapi.app.use(async (ctx, next) => {
        await next();
      });
    },
  };
};
```

## Handle errors

Here is the [Node.js client documentation](https://docs.sentry.io/clients/node/)

- Now add the logic that will catch errors.

**Path —** `./middlewares/sentry/index.js`

```js
var Raven = require('raven');
Raven.config('https://<key>@sentry.io/<project>').install();

module.exports = strapi => {
  return {
    initialize() {
      strapi.app.use(async (ctx, next) => {
        try {
          await next();
        } catch (error) {
          Raven.captureException(error);
          throw error;
        }
      });
    },
  };
};
```

::: warning
It's important to `throw(error);` to not stop the middleware stack. If you don't do that, **Boom** will not structure errors messages.
:::

## Configure the middleware

You will have to order this middleware at the end of the middleware stack.

**Path —** `./config/middleware.json`

```json
{
  ...
    "after": [
      "parser",
      "router",
      "sentry"
    ]
  }
}
```

And fianlly you have to enable the middleware.

**Path —** `./config/environments/**/middleware.json`

```json
{
  "sentry": {
    "enabled": true
  }
}
```
