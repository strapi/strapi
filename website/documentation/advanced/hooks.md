# Custom hooks

A hook is a Node.js module that adds functionality to the Strapi core. The hook specification defines the requirements a module must meet for Strapi to be able to import its code and make the new functionality available. Because they can be saved separately from the core, hooks allow Strapi code to be shared between applications and developers without having to modify the framework.

There are two types of hooks available in Strapi:

- **Core hooks**: These hooks provide many of the common features essential to a Strapi application, such as body parsing, request handling, models specification, etc. Core hooks are bundled with the Strapi core and are thus available to every application.
- **Installable hooks**: These hooks are installed into an application's `node_modules` folder. Installable hooks allow developers in the Strapi community to create and "plug-in"-like modules for use in Strapi applications.

## Generate an installable hooks

You can easily generate an installable hooks using:

```bash
$ strapi generate:hook hookName
```

A generated hook comes with every function written to be fully compatible with the models, GraphQL and JSON API specifications.

Installable hooks dependencies need to be written in the `package.json` of your application and installed as a usual node module (using npm).

## Hook specification

Each Strapi hook is implemented as a JavaScript function that takes a single argument - a reference to the running `strapi` instance - and returns an object with one or more of the keys described later in this document. So, the most basic hook would look like this:

```js
module.exports = function (strapi) {
  const hook = {
    defaults: {},

    initialize: function (cb) {
      cb();
    }
  };

  return hook;
};
```

### Default configuration

The `defaults` feature can be implemented as an object. The object you specify will be used to provide default configuration values for Strapi. You should use this feature to specify default settings for your hook. For example, if you were creating a hook that communicates with a remote service, you may want to provide a default domain and timeout length:

```js
module.exports = function (strapi) {
  const hook = {
    defaults: {
      myApiHook: {
        timeout: 5000,
        domain: 'www.myapi.com'
      }
    }
  };

  return hook;
};
```

Those configuration are available at `strapi.config.myApiHook` and can be override in the `./config` directory.

### Initialize the hook

The `initialize` feature allows a hook to perform startup tasks that may be asynchronous or rely on other hooks. All Strapi configuration is guaranteed to be completed before a hook's initialize function runs.

Examples of tasks that you may want to put in initialize are:
- Logging in to a remote API
- Reading from a database that will be used by hook methods
- Loading support files from a user-configured directory
- Waiting for another hook to load first

Like all hook features, `initialize` is optional and can be left out of your hook definition. If implemented, initialize takes one argument: a callback function which must be called in order for Strapi to finish loading:

```js
module.exports = function (strapi) {
  const hook = {
    initialize: function (cb) {
      cb();
    }
  };

  return hook;
};
```

## Hook events and dependencies

When a hook successfully initializes, it emits an event with the following name: `hook:hookName:loaded`.

You can use the "hook loaded" events to make one hook dependent on another. To do so, simply wrap your hook's `initialize` logic in a call to `strapi.on()`. For example, to make your hook wait for the `models` hook to load, you could make your initialize similar to the following:

```js
module.exports = function (strapi) {
  const hook = {
    initialize: function (cb) {
      strapi.on('hook:models:loaded', function () {
        cb();
      };
    }
  };

  return hook;
};
```

To make a hook dependent on several others, gather the event names to wait for into an array and call `strapi.after`:

```js
module.exports = function (strapi) {
  const hook = {
    initialize: function (cb) {
      strapi.after(['hook:models:loaded', 'hook:knex:loaded'], function () {
        cb();
      };
    }
  };

  return hook;
};
```
