# Strapi plugin Sentry

The official plugin to track Strapi errors with Sentry.

## Features

- Initialize a Sentry instance when your Strapi app starts
- Send errors encountered in your application's end API to Sentry
- Attach useful metadata to Sentry events, to help you with debugging
- Expose a global Sentry service

## Installation

To install this plugin, you need to add an NPM dependency to your Strapi application.

```sh
# Using Yarn
yarn add @strapi/plugin-sentry

# Or using NPM
npm install @strapi/plugin-sentry
```

## Configuration

| property       | type (default)   | description                                                                                                                                                                              |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dsn`          | string (`null`)  | Your Sentry data source name ([see Sentry docs](https://docs.sentry.io/product/sentry-basics/dsn-explainer/)).                                                                           |
| `sendMetadata` | boolean (`true`) | Whether the plugin should attach additional information (like OS, browser, etc.) to the events sent to Sentry.                                                                           |
| `init`         | object (`{}`)    | A config object that is passed directly to Sentry during the `Sentry.init()`. See all available options [on Sentry's docs](https://docs.sentry.io/platforms/node/configuration/options/) |

**Example**

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  sentry: {
    enabled: true,
    config: {
      dsn: env('SENTRY_DSN'),
      sendMetadata: true,
    },
  },
  // ...
});
```

## Global Sentry service

You can access a Sentry service throughout your app.

```js
const sentryService = strapi.plugin('sentry').service('sentry');
```

This service exposes the following methods:

### `sendError(error, configureScope)`

Use it to manually send errors to Sentry. The `configureScope` is optional, it allows you to customize the error event. Read more about Sentry's scope system [on their docs](https://docs.sentry.io/platforms/node/enriching-events/scopes/#configuring-the-scope).

**Example**

```js
try {
  // Your code here
} catch (error) {
  // Either send a simple error
  strapi.plugin('sentry').service('sentry').sendError(error);

  // Or send an error with a customized Sentry scope
  strapi
    .plugin('sentry')
    .service('sentry')
    .sendError(error, (scope, sentryInstance) => {
      // Customize the scope here
      scope.setTag('my_custom_tag', 'Tag value');
    });
  throw error;
}
```

### `getInstance()`

Use it if you need direct access to the Sentry instance, which should already already be initialized. It's useful if `sendError` doesn't suit your needs.

**Example**

```js
const sentryInstance = strapi.plugin('sentry').service('sentry').getInstance();
```

## Disabling

This plugin can be disabled in the plugins configuration file. With the `env` utility, it is also possible to disable it depending on the environment.

**Example**

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  sentry: {
    // Only enable Sentry in production
    enabled: env('NODE_ENV') === 'production',
  },
  // ...
});
```
