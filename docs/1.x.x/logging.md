# Logging

Strapi comes with a simple and useful built-in logger.
Its usage is purposely very similar to `console.log()`, but with a handful of
extra features; namely support for multiple log levels with colorized,
prefixed console output.

The logger is accessible through the `strapi` object directly with `strapi.log`.

You can work with this logger in the same way that you work with the default logger:

```js
strapi.log.info('Logs work!');
```

## Logging with Metadata

In addition to logging string messages, the logger will also optionally log additional
JSON metadata objects. Adding metadata is simple:

```js
strapi.log.info('Test log message', {
  anything: 'This is metadata'
});
```

## String interpolation

The log method provides the same string interpolation methods like `util.format`.

This allows for the following log messages.

```js
strapi.log.info('test message %s', 'my string');
// => info: test message my string
```

```js
strapi.log.info('test message %d', 123);
// => info: test message 123
```

```js
strapi.log.info('test message %j', {
  number: 123
}, {});
// => info: test message {"number":123}
// => meta = {}
```

```js
strapi.log.info('test message %s, %s', 'first', 'second', {
  number: 123
});
// => info: test message first, second
// => meta = {number: 123}
```

```js
strapi.log.info('test message', 'first', 'second', {
  number: 123
});
// => info: test message first second
// => meta = {number: 123}
```

```js
strapi.log.info('test message %s, %s', 'first', 'second', {
  number: 123
}, function() {});
// => info: test message first, second
// => meta = {number: 123}
// => callback = function() {}
```

```js
strapi.log.info('test message', 'first', 'second', {
  number: 123
}, function() {});
// => info: test message first second
// => meta = {number: 123}
// => callback = function() {}
```

## Logging levels

Setting the level for your logging message can be accomplished by using
the level specified methods defined.

```js
strapi.log.debug('This is a debug log');
strapi.log.info('This is an info log');
strapi.log.warn('This is a warning log');
strapi.log.error('This is an error log ');
```
