# Lifecyle events

Strapi applications inherit [Node.js `EventEmitter` interface](https://nodejs.org/api/events.html#events_class_eventemitter), meaning that they can both emit and listen for custom events.

!!! note
    While it is not recommended that you utilize Strapi events directly in application code (since your apps should strive to be as stateless as possible to facilitate scalability), events can be very useful when extending Strapi (via hooks or generators) and in a testing environment.

None of the events are emitted with extra information, so your function should not have any arguments.

## Events

| Event name | Emitted when |
|------------| -------------|
| `ready` | The application has been loaded and the bootstrap has run, but it is not yet listening for requests. |
| `started` | The application has been started and is listening for requests. |
| `stopped` | The application has been stopped and is no longer listening for requests. |
| `hook:hookId:loaded` | The hook with the specified identity loaded and ran its `initialize()` method successfully. |
| `hooks:builtIn:ready` | All the built-in hooks are ready. |
| `bootstrap:done` | The `bootstrap` function is done. |

Examples:

```js
/**
 * Fires your handler next time the event is triggered
 * and every time afterward.
 */

strapi.on('hook:yourHookId:someEvent', function yourEventHandler () {
  // Some code here.
});
```

```js
/**
 * Fires your handler next time the specified event is
 * triggered, and then stop listening.
 */

strapi.once('hook:yourHookId:someEvent', function yourEventHandler () {
  // Some code here.
});
```

```js
/**
 * Fires your handler if the specified event has already
 * been triggered or when it is triggered.
 */

strapi.after('hook:yourHookId:someEvent', function yourEventHandler () {
  // Some code here.
});
```

```js
/**
 * You can actually wait for several events using
 * `.after` as well.
 */

strapi.after([
  'hook:yourHookId:someEvent',
  'hook:yourHookId:someOtherEvent'
], function yourEventHandler () {
  // Some code here.
});
```

## Bootstrap function

The bootstrap function is a server-side JavaScript file that is executed by Strapi just before your application is started.

This gives you an opportunity to set up your data model, run jobs, or perform some special logic.

Configuration:

- Key: `bootstrap`
- Environment: all
- Location: `./config/functions/bootstrap.js`
- Type: `function`

Example:

```js
module.exports.bootstrap = function (cb) {
  strapi.log.info('Hooks are loaded but the server is not started');
  strapi.log.info('until the callback method is not triggered.');
  cb();
};
```

!!! important
    It's very important to trigger the callback method when you are finished with the bootstrap. Otherwise your server will never start, since it's waiting on the bootstrap.
