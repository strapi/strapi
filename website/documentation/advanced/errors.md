# Error handling

## The error event

Error handlers can be specified with `strapi.app.on('error')`. If no error handler is specified, a default error handler is used. Error handlers receive all errors that make their way back through the middleware chain, if an error is caught and not thrown again, it will not be handled by the error handler. If not error event handler is specified, then `strapi.app.onerror` will be used, which simply log the error if `error.expose` is true and `app.silent` is false.

```js
strapi.app.on('error', function (err) {
  log.error('server error', err);
});
```

If an error in the req/res cycle and it is not possible to respond to the client, the `Context` instance is also passed:

```js
strapi.app.on('error', function (err, ctx) {
  log.error('server error', err, ctx);
});
```

When an error occurs and it is still possible to respond to the client, aka no data has been written to the socket, Strapi will respond appropriately with a `500` "Internal Server Error". In either case an app-level "error" is emitted for logging purposes.

## Try-catch

Using generators means that you can try-catch `next`. For example, this example prepends all error messages with "Error: "

```js
strapi.app.use(function * (next) {
  try {
    yield next;
  } catch (error) {
    error.message = 'Error: ' + error.message;
    throw error;
  }
});
```

The default error handler is essentially a try-catch at the very beginning of the middleware chain. To use a different error handler, simply put another try-catch at the beginning of the middleware chain, and handle the error there. However, the default error handler is good enough for most use cases. It will use a status code of `err.status`, or by default `500`. If `err.expose` is true, then `err.message` will be the reply. Otherwise, a message generated from the error code will be used (e.g. for the code `500` the message "Internal Server Error" will be used). All headers will be cleared from the request, but any headers in `err.headers` will then be set. You can use a try-catch, as specified above, to add a header to this list.
