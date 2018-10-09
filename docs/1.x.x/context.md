# Context

A Strapi `Context` encapsulates Node's `request` and `response` objects
into a single object which provides many helpful methods for writing
web applications and APIs.

These operations are used so frequently in HTTP server development
that they are added at this level instead of a higher level framework,
which would force middleware to re-implement this common functionality.

A `Context` is created _per_ request, and is referenced in middleware
as the receiver, or the `this` identifier, as shown in the following
snippet:

```js
strapi.app.use(function * () {
  this; // is the Context
  this.request; // is a Strapi Request
  this.response; // is a Strapi Response
});
```

Many of the context's accessors and methods simply delegate to their `ctx.request` or `ctx.response`
equivalents for convenience, and are otherwise identical. For example `ctx.type` and `ctx.length`
delegate to the `response` object, and `ctx.path` and `ctx.method` delegate to the `request`.

## API

`Context` specific methods and accessors.

### ctx.req

Node's `request` object.

### ctx.res

Node's `response` object.

Bypassing Strapi's response handling is not supported. Avoid using the following Node properties:

- `res.statusCode`
- `res.writeHead()`
- `res.write()`
- `res.end()`

### ctx.request

A Strapi `Request` object.

### ctx.response

A Strapi `Response` object.

### ctx.state

The recommended namespace for passing information through middleware and to your front-end views.

```js
this.state.user = yield User.find(id);
```

### ctx.app

Application instance reference.

### ctx.cookies.get(name, [options])

Get cookie `name` with `options`:

- `signed` the cookie requested should be signed

Strapi uses the [cookies](https://github.com/jed/cookies) module where options are simply passed.

### ctx.cookies.set(name, value, [options])

Set cookie `name` to `value` with `options`:

- `signed` sign the cookie value
- `expires` a `Date` for cookie expiration
- `path` cookie path, `/'` by default
- `domain` cookie domain
- `secure` secure cookie
- `httpOnly` server-accessible cookie, `true` by default

Strapi uses the [cookies](https://github.com/jed/cookies) module where options are simply passed.

### ctx.throw([msg], [status], [properties])

Helper method to throw an error with a `.status` property
defaulting to `500` that will allow Strapi to respond appropriately.
The following combinations are allowed:

```js
this.throw(403);
this.throw('name required', 400);
this.throw(400, 'name required');
this.throw('something exploded');
```

For example `this.throw('name required', 400)` is equivalent to:

```js
const err = new Error('name required');
err.status = 400;
throw err;
```

Note that these are user-level errors and are flagged with
`err.expose` meaning the messages are appropriate for
client responses, which is typically not the case for
error messages since you do not want to leak failure
details.

You may optionally pass a `properties` object which is merged into the error as-is,
useful for decorating machine-friendly errors which are reported to the requester upstream.

```js
this.throw(401, 'access_denied', { user: user });
this.throw('access_denied', { user: user });
```

Strapi uses [http-errors](https://github.com/jshttp/http-errors) to create errors.

### ctx.assert(value, [msg], [status], [properties])

Helper method to throw an error similar to `.throw()`
when `!value`. Similar to Node's [assert()](http://nodejs.org/api/assert.html)
method.

```js
this.assert(this.state.user, 401, 'User not found. Please login!');
```

Strapi uses [http-assert](https://github.com/jshttp/http-assert) for assertions.

### ctx.respond

To bypass Strapi's built-in response handling, you may explicitly set `this.respond = false;`.
Use this if you want to write to the raw `res` object instead of letting Strapi handle
the response for you.

Note that using this is not supported by Strapi. This may break intended functionality
of Strapi middleware and Strapi itself. Using this property is considered a hack and is
only a convenience to those wishing to use traditional `fn(req, res)` functions and middleware
within Strapi.

## Request aliases

The following accessors and alias [Request](request.md) equivalents:

- `ctx.header`
- `ctx.headers`
- `ctx.method`
- `ctx.method=`
- `ctx.url`
- `ctx.url=`
- `ctx.originalUrl`
- `ctx.origin`
- `ctx.href`
- `ctx.path`
- `ctx.path=`
- `ctx.query`
- `ctx.query=`
- `ctx.querystring`
- `ctx.querystring=`
- `ctx.host`
- `ctx.hostname`
- `ctx.fresh`
- `ctx.stale`
- `ctx.socket`
- `ctx.protocol`
- `ctx.secure`
- `ctx.ip`
- `ctx.ips`
- `ctx.subdomains`
- `ctx.is()`
- `ctx.accepts()`
- `ctx.acceptsEncodings()`
- `ctx.acceptsCharsets()`
- `ctx.acceptsLanguages()`
- `ctx.get()`

## Response aliases

The following accessors and alias [Response](response.md) equivalents:

- `ctx.body`
- `ctx.body=`
- `ctx.status`
- `ctx.status=`
- `ctx.message`
- `ctx.message=`
- `ctx.length=`
- `ctx.length`
- `ctx.type=`
- `ctx.type`
- `ctx.headerSent`
- `ctx.redirect()`
- `ctx.attachment()`
- `ctx.set()`
- `ctx.append()`
- `ctx.remove()`
- `ctx.lastModified=`
- `ctx.etag=`
