# Interfaces

The Strapi SQL dialect provides several options to deal with query output. The following methods are present on the query builder, schema builder, and the raw builder.

## Promises

[Promises](https://github.com/petkaantonov/bluebird#what-are-promises-and-why-should-i-use-them) are the preferred way of dealing with queries in the dialect, as they allow you to return values from a fulfillment handler, which in turn become the value of the promise. The main benefit of promises are the ability to catch thrown errors without crashing the node app, making your code behave like a `.try` / `.catch` / `.finally` in synchronous code.

```js
strapi.connections.default
  .select('name').from('users')
  .where('id', '>', 20)
  .andWhere('id', '<', 200).limit(10)
  .offset(x)
  .then(function (rows) {
    return _.pluck(rows, 'name');
  })
  .then(function (names) {
    return strapi.connections.default
      .select('id').from('nicknames')
      .whereIn('nickname', names);
  })
  .then(function (rows) {
    console.log(rows);
  })
  .catch(function (error) {
    console.error(error)
  });
```

### .then(onFulfilled)

Coerces the current query builder chain into a promise state, accepting the resolve and reject handlers as specified by the [Promises/A+ spec](http://promises-aplus.github.com/promises-spec). As stated in the spec, more than one call to the `then` method for the current query chain will resolve with the same value, in the order they were called; the query will not be executed multiple times.

```js
strapi.connections.default
  .select('*').from('users')
  .where({
    name: 'Tim'
  })
  .then(function (rows) {
    return strapi.connections.default.insert({
      user_id: rows[0].id,
      name: 'Test'
    }, 'id').into('accounts');
  })
  .then(function (id) {
    console.log('Inserted Account ' + id);
  })
  .catch(function (error) {
    console.error(error);
  });
```

### .catch(onRejected)

Coerces the current query builder into a promise state, catching any error thrown by the query, the same as calling `.then(null, onRejected)`.

```js
return strapi.connections.default.insert({
    id: 1, name: 'Test'
  }, 'id').into('accounts')
  .catch(function (error) {
    console.error(error);
  })
  .then(function () {
    return strapi.connections.default
      .select('*').from('accounts')
      .where('id', 1);
  })
  .then(function (rows) {
    console.log(rows[0]);
  })
  .catch(function (error) {
    console.error(error);
  });
```

### .tap(sideEffectHandler)

Executes side effects on the resolved response, ultimately returning a promise that fulfills with the original value. A thrown error or rejected promise will cause the promise to transition into a rejected state.

Using only `.then()`:

```js
query.then(function (x) {
  doSideEffectsHere(x);
  return x;
});
```

Using `.tap()`:

```js
promise.tap(doSideEffectsHere);
```

### .map(mapper)

A passthrough to [Bluebird's map implementation](https://github.com/petkaantonov/bluebird/blob/master/API.md#mapfunction-mapper---promise) with the result set.

```js
strapi.connections.default
  .select('name').from('users')
  .limit(10)
  .map(function (row) {
    return row.name;
  })
  .then(function (names) {
    console.log(names);
  })
  .catch(function (e) {
    console.error(e);
  });
```

### .reduce(reducer, [initialValue])

A passthrough to [Bluebird's reduce implementation](https://github.com/petkaantonov/bluebird/blob/master/API.md#reducefunction-reducer--dynamic-initialvalue---promise) with the result set.

```js
strapi.connections.default
  .select('name').from('users')
  .limit(10)
  .reduce(function (memo, row) {
    memo.names.push(row.name);
    memo.count++;
    return memo;
  }, {
    count: 0,
    names: []
  })
  .then(function (obj) {
    console.log(obj);
  })
  .catch(function (e) {
    console.error(e);
  });
```

### .bind(context)

A passthrough to [Bluebird's bind method](https://github.com/petkaantonov/bluebird/blob/master/API.md#binddynamic-thisarg---promise) which sets the context value (this) for the returned promise.

```js
strapi.connections.default
  .select('name').from('users')
  .limit(10)
  .bind(console)
  .then(console.log)
  .catch(console.error)
```

### .return(value)

Shorthand for calling `.then(function () { return value })`.

Without `return`:

```js
strapi.connections.default
  .insert(values)
  .into('users')
  .then(function () {
    return {inserted: true};
  });

strapi.connections.default
  .insert(values)
  .into('users')
  .return({
    inserted: true
  });
```

## Callbacks

### .asCallback(callback)

If you'd prefer a callback interface over promises, the `asCallback` function accepts a standard node style callback for executing the query chain. Note that as with the `then` method, subsequent calls to the same query chain will return the same result.

```js
strapi.connections.default
  .select('name').from('users')
  .where('id', '>', 20)
  .andWhere('id', '<', 200)
  .limit(10)
  .offset(x)
  .asCallback(function (err, rows) {
    if (err) return {
      console.error(err);
    }
    strapi.connections.default
      .select('id').from('nicknames')
      .whereIn('nickname', _.pluck(rows, 'name'))
      .asCallback(function (err, rows) {
        if (err) return {
          console.error(err);
        }
        console.log(rows);
      });
  });
```

## Streams

Streams are a powerful way of piping data through as it comes in, rather than all at once. You can read more about streams [here at substack's stream handbook](https://github.com/substack/stream-handbook). See the following for example uses of stream & pipe. If you wish to use streams with PostgreSQL, you must also install the [pg-query-stream module](https://github.com/brianc/node-pg-query-stream). On an HTTP server, make sure to manually close your streams if a request is aborted.

### .stream([options], [callback])

If called with a callback, the callback is passed the stream and a promise is returned. Otherwise, the readable stream is returned.

Retrieve the stream:

```js
const stream = strapi.connections.default
  .select('*').from('users')
  .stream();

stream.pipe(writableStream);
```

With options:
```js
const stream = strapi.connections.default
  .select('*').from('users')
  .stream({
    highWaterMark: 5
  });

stream.pipe(writableStream);
```

Use as a promise:
```js
const stream = strapi.connections.default
  .select('*').from('users')
  .where(strapi.connections.default.raw('id = ?', [1]))
  .stream(function (stream) {
    stream.pipe(writableStream);
  })
  .then(function () {
    // ...
  })
  .catch(function (e) {
    console.error(e);
  });
```

### .pipe(writableStream)

Pipe a stream for the current query to a `writableStream`.

```js
const stream = strapi.connections.default
  .select('*').from('users')
  .pipe(writableStream);
```

## Events

### query

A `query` event is fired just before a query takes place, providing data about the query, including the connection's `__cid` property and any other information about the query as described in `toSQL`. Useful for logging all queries throughout your application.

```js
strapi.connections.default
  .select('*').from('users')
  .on('query', function (data) {
    app.log(data);
  })
  .then(function () {
    // ...
  });
```

### query-error

A `query-error` event is fired when an error occurs when running a query, providing the error object and data about the query, including the connection's `__cid` property and any other information about the query as described in `toSQL`. Useful for logging all query errors throughout your application.

```js
strapi.connections.default
  .select(['NonExistentColumn']).from('users')
  .on('query-error', function (error, obj) {
    app.log(error);
  })
  .then(function () {
    // ...
  })
  .catch(function (error) {
    // Same error object as the query-error event provides.
  });
```

## Other

### .toString()

Returns an array of query strings filled out with the correct values based on bindings, etc. Useful for debugging.

```js
strapi.connections.default
  .select('*').from('users')
  .where(strapi.connections.default.raw('id = ?', [1]))
  .toString()
```

### .toSQL()

Returns an array of query strings filled out with the correct values based on bindings, etc. Useful for debugging.

```js
strapi.connections.default
  .select('*').from('users')
  .where(strapi.connections.default.raw('id = ?', [1]))
  .toSQL()
```
