# Strapi plugin Sentry

The official plugin to track Strapi errors with Sentry.

## Features

- Initialize a Sentry instance when your Strapi app starts
- Send errors encountered in your application's end API to Sentry
- Attach useful metadata to Sentry events, to help you with debugging
- Expose a global Sentry service

## Configuration

| property       | type (default) | description                                                                                                                                         |
| -------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dsn`          | string (null)  | Your Sentry data source name ([see Sentry docs](https://docs.sentry.io/product/sentry-basics/dsn-explainer/)). Omitting it will disable the plugin. |
| `sendMetadata` | boolean (true) | Whether the plugin should attach additional information (like OS, browser, etc.) to the events sent to Sentry.                                      |

**Example**

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  sentry: {
    dsn: env('SENTRY_DSN'),
    sendMetadata: true,
  },
  // ...
});
```

## Global Sentry service

You can access a Sentry service throughout your app.

```js
const sentryService = strapi.plugins.sentry.services.sentry;
```

This service exposes the following methods:

### `sendError(error, configureScope)`

Use it to manually send errors to Sentry. The `configureScope` is optional, it allows you to customize the error event. Read more about Sentry's scope system [on their docs](https://docs.sentry.io/platforms/node/enriching-events/scopes/#configuring-the-scope).

**Example**

```js
try {
  // Your code here
} catch (error) {
  strapi.plugins.sentry.services.sentry.sendError(error, (scope, sentryInstance) => {
    // Customize the scope here
    scope.setTag('my_custom_tag', 'Tag value');
  });
  throw error;
}
```

### `sendError(error, configureScope)`

Use it if you need direct access to the Sentry instance, which should already already be initialized. It's useful if `sendError` doesn't suit your needs.

**Example**

```js
const sentryInstance = strapi.plugins.sentry.services.sentry.getInstance();
```
