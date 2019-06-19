# Responses

See the [responses concepts](../concepts/concepts.md#responses) for details.

### API Reference

For more information, please refer to the [Koa response documentation](http://koajs.com/#response).

## Response

The context object (`ctx`) contains a list of values and functions useful to manage server responses. They are accessible through `ctx.response`, from [controllers](controllers.md) and [policies](policies.md).

#### response.header

Response header object.

#### response.headers

Response header object. Alias as `response.header`.


#### response.socket

Request socket.

#### response.status

Get response status. By default, `response.status` is set to `404` unlike node's `res.statusCode` which defaults to `200`.

#### response.status=

Set response status via numeric code:

- 100 "continue"
- 101 "switching protocols"
- 102 "processing"
- 200 "ok"
- 201 "created"
- 202 "accepted"
- 203 "non-authoritative information"
- 204 "no content"
- 205 "reset content"
- 206 "partial content"
- 207 "multi-status"
- 208 "already reported"
- 226 "im used"
- 300 "multiple choices"
- 301 "moved permanently"
- 302 "found"
- 303 "see other"
- 304 "not modified"
- 305 "use proxy"
- 307 "temporary redirect"
- 308 "permanent redirect"
- 400 "bad request"
- 401 "unauthorized"
- 402 "payment required"
- 403 "forbidden"
- 404 "not found"
- 405 "method not allowed"
- 406 "not acceptable"
- 407 "proxy authentication required"
- 408 "request timeout"
- 409 "conflict"
- 410 "gone"
- 411 "length required"
- 412 "precondition failed"
- 413 "payload too large"
- 414 "uri too long"
- 415 "unsupported media type"
- 416 "range not satisfiable"
- 417 "expectation failed"
- 418 "I'm a teapot"
- 422 "unprocessable entity"
- 423 "locked"
- 424 "failed dependency"
- 426 "upgrade required"
- 428 "precondition required"
- 429 "too many requests"
- 431 "request header fields too large"
- 500 "internal server error"
- 501 "not implemented"
- 502 "bad gateway"
- 503 "service unavailable"
- 504 "gateway timeout"
- 505 "http version not supported"
- 506 "variant also negotiates"
- 507 "insufficient storage"
- 508 "loop detected"
- 510 "not extended"
- 511 "network authentication required"

::: note
Don't worry too much about memorizing these strings,
if you have a typo an error will be thrown, displaying this list
so you can make a correction.
:::

#### response.message

Get response status message. By default, `response.message` is
associated with `response.status`.

#### response.message=

Set response status message to the given value.

#### response.length=

Set response Content-Length to the given value.

#### response.length

Return response Content-Length as a number when present, or deduce
from `ctx.body` when possible, or `undefined`.

#### response.body

Get response body.

#### response.body=

Set response body to one of the following:

- `string` written
- `Buffer` written
- `Stream` piped
- `Object` || `Array` json-stringified
- `null` no content response

If `response.status` has not been set, Koa will automatically set the status to `200` or `204`.

##### String

The Content-Type is defaulted to text/html or text/plain, both with
a default charset of utf-8. The Content-Length field is also set.

##### Buffer

The Content-Type is defaulted to application/octet-stream, and Content-Length
is also set.

##### Stream

The Content-Type is defaulted to application/octet-stream.

Whenever a stream is set as the response body, `.onerror` is automatically added as a listener to the `error` event to catch any errors.
In addition, whenever the request is closed (even prematurely), the stream is destroyed.
If you do not want these two features, do not set the stream as the body directly.
For example, you may not want this when setting the body as an HTTP stream in a proxy as it would destroy the underlying connection.

See: [https://github.com/koajs/koa/pull/612](https://github.com/koajs/koa/pull/612) for more information.

Here's an example of stream error handling without automatically destroying the stream:

```js
const PassThrough = require('stream').PassThrough;

app.use(async ctx => {
  ctx.body = someHTTPStream.on('error', ctx.onerror).pipe(PassThrough());
});
```

##### Object

The Content-Type is defaulted to application/json. This includes plain objects `{ foo: 'bar' }` and arrays `['foo', 'bar']`.

#### response.get(field)

Get a response header field value with case-insensitive `field`.

```js
const etag = ctx.response.get('ETag');
```

#### response.set(field, value)

Set response header `field` to `value`:

```js
ctx.set('Cache-Control', 'no-cache');
```

#### response.append(field, value)
Append additional header `field` with value `val`.

```js
ctx.append('Link', '<http://127.0.0.1/>');
```

#### response.set(fields)

Set several response header `fields` with an object:

```js
ctx.set({
  'Etag': '1234',
  'Last-Modified': date
});
```

#### response.remove(field)

Remove header `field`.

#### response.type

Get response `Content-Type` void of parameters such as "charset".

```js
const ct = ctx.type;
// => "image/png"
```

#### response.type=

Set response `Content-Type` via mime string or file extension.

```js
ctx.type = 'text/plain; charset=utf-8';
ctx.type = 'image/png';
ctx.type = '.png';
ctx.type = 'png';
```

::: note
when appropriate a `charset` is selected for you, for
example `response.type = 'html'` will default to "utf-8". If you need to overwrite `charset`,
use `ctx.set('Content-Type', 'text/html')` to set response header field to value directly.
:::

#### response.is(types...)

Very similar to `ctx.request.is()`.
Check whether the response type is one of the supplied types.
This is particularly useful for creating middleware that
manipulate responses.

For example, this is a middleware that minifies
all HTML responses except for streams.

```js
const minify = require('html-minifier');

app.use(async (ctx, next) => {
await next();

if (!ctx.response.is('html')) return;

let body = ctx.body;
if (!body || body.pipe) return;

if (Buffer.isBuffer(body)) body = body.toString();
  ctx.body = minify(body);
});
```

#### response.redirect(url, [alt])

Perform a [302] redirect to `url`.

The string "back" is special-cased
to provide Referrer support, when Referrer
is not present `alt` or "/" is used.

```js
ctx.redirect('back');
ctx.redirect('back', '/index.html');
ctx.redirect('/login');
ctx.redirect('http://google.com');
```

To alter the default status of `302`, simply assign the status
before or after this call. To alter the body, assign it after this call:

```js
ctx.status = 301;
ctx.redirect('/cart');
ctx.body = 'Redirecting to shopping cart';
```

#### response.attachment([filename])

Set `Content-Disposition` to "attachment" to signal the client
to prompt for download. Optionally specify the `filename` of the
download.

#### response.headerSent

Check if a response header has already been sent. Useful for seeing
if the client may be notified on error.

#### response.lastModified

Return the `Last-Modified` header as a `Date`, if it exists.

#### response.lastModified=

Set the `Last-Modified` header as an appropriate UTC string.
You can either set it as a `Date` or date string.

```js
ctx.response.lastModified = new Date();
```

#### response.etag=

Set the ETag of a response including the wrapped `"`s.
Note that there is no corresponding `response.etag` getter.

```js
ctx.response.etag = crypto.createHash('md5').update(ctx.body).digest('hex');
```

#### response.vary(field)

Vary on `field`.

#### response.flushHeaders()

Flush any set headers, and begin the body.

## Advanced responses

Strapi integrates [Boom](https://github.com/hapijs/boom): a set of utilities for returning HTTP errors. Every Boom’s functions are accessible through the `ctx.response`.

You can also override responses based on them status. Please read the [configuration responses](../configurations/configurations.md#responses) for that.

::: note
Every Boom's functions is delegated to the context. It means that `ctx.notFound` is a shortcut to `ctx.response.notFound`.
:::

### API Reference

For more information, please refer to the [Boom documentation](https://github.com/hapijs/boom).

<!-- toc -->

 - [HTTP 4xx Errors](#http-4xx-errors)
   - [`ctx.response.badRequest([message], [data])`](#ctxresponsebadrequestmessage-data)
   - [`ctx.response.unauthorized([message], [scheme], [attributes])`](#ctxresponseunauthorizedmessage-scheme-attributes)
   - [`ctx.response.paymentRequired([message], [data])`](#ctxresponsepaymentrequiredmessage-data)
   - [`ctx.response.forbidden([message], [data])`](#ctxresponseforbiddenmessage-data)
   - [`ctx.response.notFound([message], [data])`](#ctxresponsenotfoundmessage-data)
   - [`ctx.response.methodNotAllowed([message], [data], [allow])`](#ctxresponsemethodnotallowedmessage-data-allow)
   - [`ctx.response.notAcceptable([message], [data])`](#ctxresponsenotacceptablemessage-data)
   - [`ctx.response.proxyAuthRequired([message], [data])`](#ctxresponseproxyauthrequiredmessage-data)
   - [`ctx.response.clientTimeout([message], [data])`](#ctxresponseclienttimeoutmessage-data)
   - [`ctx.response.conflict([message], [data])`](#ctxresponseconflictmessage-data)
   - [`ctx.response.resourceGone([message], [data])`](#ctxresponseresourcegonemessage-data)
   - [`ctx.response.lengthRequired([message], [data])`](#ctxresponselengthrequiredmessage-data)
   - [`ctx.response.preconditionFailed([message], [data])`](#ctxresponsepreconditionfailedmessage-data)
   - [`ctx.response.entityTooLarge([message], [data])`](#ctxresponseentitytoolargemessage-data)
   - [`ctx.response.uriTooLong([message], [data])`](#ctxresponseuritoolongmessage-data)
   - [`ctx.response.unsupportedMediaType([message], [data])`](#ctxresponseunsupportedmediatypemessage-data)
   - [`ctx.response.rangeNotSatisfiable([message], [data])`](#ctxresponserangenotsatisfiablemessage-data)
   - [`ctx.response.expectationFailed([message], [data])`](#ctxresponseexpectationfailedmessage-data)
   - [`ctx.response.teapot([message], [data])`](#ctxresponseteapotmessage-data)
   - [`ctx.response.badData([message], [data])`](#ctxresponsebaddatamessage-data)
   - [`ctx.response.locked([message], [data])`](#ctxresponselockedmessage-data)
   - [`ctx.response.preconditionRequired([message], [data])`](#ctxresponsepreconditionrequiredmessage-data)
   - [`ctx.response.tooManyRequests([message], [data])`](#ctxresponsetoomanyrequestsmessage-data)
   - [`ctx.response.illegal([message], [data])`](#ctxresponseillegalmessage-data)
 - [HTTP 5xx Errors](#http-5xx-errors)
   - [`ctx.response.badImplementation([message], [data])` - (*alias: `internal`*)](#ctxresponsebadimplementationmessage-data---alias-internal)
   - [`ctx.response.notImplemented([message], [data])`](#ctxresponsenotimplementedmessage-data)
   - [`ctx.response.badGateway([message], [data])`](#ctxresponsebadgatewaymessage-data)
   - [`ctx.response.serverUnavailable([message], [data])`](#ctxresponseserverunavailablemessage-data)
   - [`ctx.response.gatewayTimeout([message], [data])`](#ctxresponsegatewaytimeoutmessage-data)

<!-- tocstop -->

### HTTP 4xx Errors

#### `ctx.response.badRequest([message], [data])`

Returns a 400 Bad Request error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.badRequest('invalid query');
```

Generates the following response payload:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "invalid query"
}
```

#### `ctx.response.unauthorized([message], [scheme], [attributes])`

Returns a 401 Unauthorized error where:
- `message` - optional message.
- `scheme` can be one of the following:
  - an authentication scheme name
  - an array of string values. These values will be separated by ', ' and set to the 'WWW-Authenticate' header.
- `attributes` - an object of values to use while setting the 'WWW-Authenticate' header. This value is only used
  when `scheme` is a string, otherwise it is ignored. Every key/value pair will be included in the
  'WWW-Authenticate' in the format of 'key="value"' as well as in the response payload under the `attributes` key.  Alternatively value can be a string which is use to set the value of the scheme, for example setting the token value for negotiate header.  If string is used message parameter must be null.
  `null` and `undefined` will be replaced with an empty string. If `attributes` is set, `message` will be used as
  the 'error' segment of the 'WWW-Authenticate' header. If `message` is unset, the 'error' segment of the header
  will not be present and `isMissing` will be true on the error object.

If either `scheme` or `attributes` are set, the resultant `Boom` object will have the 'WWW-Authenticate' header set for the response.

```js
ctx.response.unauthorized('invalid password');
```

Generates the following response:

```json
"payload": {
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "invalid password"
},
"headers" {}
```

```js
ctx.response.unauthorized('invalid password', 'sample');
```

Generates the following response:

```json
"payload": {
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "invalid password",
  "attributes": {
    "error": "invalid password"
  }
},
"headers" {
  "WWW-Authenticate": "sample error=\"invalid password\""
}
```

```js
ctx.response.unauthorized(null, 'Negotiate', 'VGhpcyBpcyBhIHRlc3QgdG9rZW4=');
```

Generates the following response:

```json
"payload": {
  "statusCode": 401,
  "error": "Unauthorized",
  "attributes": "VGhpcyBpcyBhIHRlc3QgdG9rZW4="
},
"headers" {
  "WWW-Authenticate": "Negotiate VGhpcyBpcyBhIHRlc3QgdG9rZW4="
}
```

```js
ctx.response.unauthorized('invalid password', 'sample', { ttl: 0, cache: null, foo: 'bar' });
```

Generates the following response:

```json
"payload": {
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "invalid password",
  "attributes": {
    "error": "invalid password",
    "ttl": 0,
    "cache": "",
    "foo": "bar"
  }
},
"headers" {
  "WWW-Authenticate": "sample ttl=\"0\", cache=\"\", foo=\"bar\", error=\"invalid password\""
}
```

#### `ctx.response.paymentRequired([message], [data])`

Returns a 402 Payment Required error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.paymentRequired('bandwidth used');
```

Generates the following response payload:

```json
{
  "statusCode": 402,
  "error": "Payment Required",
  "message": "bandwidth used"
}
```

#### `ctx.response.forbidden([message], [data])`

Returns a 403 Forbidden error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.forbidden('try again some time');
```

Generates the following response payload:

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "try again some time"
}
```

#### `ctx.response.notFound([message], [data])`

Returns a 404 Not Found error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.notFound('missing');
```

Generates the following response payload:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "missing"
}
```

#### `ctx.response.methodNotAllowed([message], [data], [allow])`

Returns a 405 Method Not Allowed error where:
- `message` - optional message.
- `data` - optional additional error data.
- `allow` - optional string or array of strings (to be combined and separated by ', ') which is set to the 'Allow' header.

```js
ctx.response.methodNotAllowed('that method is not allowed');
```

Generates the following response payload:

```json
{
  "statusCode": 405,
  "error": "Method Not Allowed",
  "message": "that method is not allowed"
}
```

#### `ctx.response.notAcceptable([message], [data])`

Returns a 406 Not Acceptable error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.notAcceptable('unacceptable');
```

Generates the following response payload:

```json
{
  "statusCode": 406,
  "error": "Not Acceptable",
  "message": "unacceptable"
}
```

#### `ctx.response.proxyAuthRequired([message], [data])`

Returns a 407 Proxy Authentication Required error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.proxyAuthRequired('auth missing');
```

Generates the following response payload:

```json
{
  "statusCode": 407,
  "error": "Proxy Authentication Required",
  "message": "auth missing"
}
```

#### `ctx.response.clientTimeout([message], [data])`

Returns a 408 Request Time-out error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.clientTimeout('timed out');
```

Generates the following response payload:

```json
{
  "statusCode": 408,
  "error": "Request Time-out",
  "message": "timed out"
}
```

#### `ctx.response.conflict([message], [data])`

Returns a 409 Conflict error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.conflict('there was a conflict');
```

Generates the following response payload:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "there was a conflict"
}
```

#### `ctx.response.resourceGone([message], [data])`

Returns a 410 Gone error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.resourceGone('it is gone');
```

Generates the following response payload:

```json
{
  "statusCode": 410,
  "error": "Gone",
  "message": "it is gone"
}
```

#### `ctx.response.lengthRequired([message], [data])`

Returns a 411 Length Required error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.lengthRequired('length needed');
```

Generates the following response payload:

```json
{
  "statusCode": 411,
  "error": "Length Required",
  "message": "length needed"
}
```

#### `ctx.response.preconditionFailed([message], [data])`

Returns a 412 Precondition Failed error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.preconditionFailed();
```

Generates the following response payload:

```json
{
  "statusCode": 412,
  "error": "Precondition Failed"
}
```

#### `ctx.response.entityTooLarge([message], [data])`

Returns a 413 Request Entity Too Large error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.entityTooLarge('too big');
```

Generates the following response payload:

```json
{
  "statusCode": 413,
  "error": "Request Entity Too Large",
  "message": "too big"
}
```

#### `ctx.response.uriTooLong([message], [data])`

Returns a 414 Request-URI Too Large error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.uriTooLong('uri is too long');
```

Generates the following response payload:

```json
{
  "statusCode": 414,
  "error": "Request-URI Too Large",
  "message": "uri is too long"
}
```

#### `ctx.response.unsupportedMediaType([message], [data])`

Returns a 415 Unsupported Media Type error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.unsupportedMediaType('that media is not supported');
```

Generates the following response payload:

```json
{
  "statusCode": 415,
  "error": "Unsupported Media Type",
  "message": "that media is not supported"
}
```

#### `ctx.response.rangeNotSatisfiable([message], [data])`

Returns a 416 Requested Range Not Satisfiable error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.rangeNotSatisfiable();
```

Generates the following response payload:

```json
{
  "statusCode": 416,
  "error": "Requested Range Not Satisfiable"
}
```

#### `ctx.response.expectationFailed([message], [data])`

Returns a 417 Expectation Failed error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.expectationFailed('expected this to work');
```

Generates the following response payload:

```json
{
  "statusCode": 417,
  "error": "Expectation Failed",
  "message": "expected this to work"
}
```

#### `ctx.response.teapot([message], [data])`

Returns a 418 I'm a Teapot error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.teapot('sorry, no coffee...');
```

Generates the following response payload:

```json
{
  "statusCode": 418,
  "error": "I'm a Teapot",
  "message": "Sorry, no coffee..."
}
```

#### `ctx.response.badData([message], [data])`

Returns a 422 Unprocessable Entity error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.badData('your data is bad and you should feel bad');
```

Generates the following response payload:

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "your data is bad and you should feel bad"
}
```

#### `ctx.response.locked([message], [data])`

Returns a 423 Locked error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.locked('this resource has been locked');
```

Generates the following response payload:

```json
{
  "statusCode": 423,
  "error": "Locked",
  "message": "this resource has been locked"
}
```

#### `ctx.response.preconditionRequired([message], [data])`

Returns a 428 Precondition Required error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.preconditionRequired('you must supply an If-Match header');
```

Generates the following response payload:

```json
{
  "statusCode": 428,
  "error": "Precondition Required",
  "message": "you must supply an If-Match header"
}
```

#### `ctx.response.tooManyRequests([message], [data])`

Returns a 429 Too Many Requests error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.tooManyRequests('you have exceeded your request limit');
```

Generates the following response payload:

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "you have exceeded your request limit"
}
```

#### `ctx.response.illegal([message], [data])`

Returns a 451 Unavailable For Legal Reasons error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.illegal('you are not permitted to view this resource for legal reasons');
```

Generates the following response payload:

```json
{
  "statusCode": 451,
  "error": "Unavailable For Legal Reasons",
  "message": "you are not permitted to view this resource for legal reasons"
}
```

### HTTP 5xx Errors

All 500 errors hide your message from the end user. Your message is recorded in the server log.

#### `ctx.response.badImplementation([message], [data])` - (*alias: `internal`*)

Returns a 500 Internal Server Error error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.badImplementation('terrible implementation');
```

Generates the following response payload:

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An internal server error occurred"
}
```

#### `ctx.response.notImplemented([message], [data])`

Returns a 501 Not Implemented error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.notImplemented('method not implemented');
```

Generates the following response payload:

```json
{
  "statusCode": 501,
  "error": "Not Implemented",
  "message": "method not implemented"
}
```

#### `ctx.response.badGateway([message], [data])`

Returns a 502 Bad Gateway error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.badGateway('that is a bad gateway');
```

Generates the following response payload:

```json
{
  "statusCode": 502,
  "error": "Bad Gateway",
  "message": "that is a bad gateway"
}
```

#### `ctx.response.serverUnavailable([message], [data])`

Returns a 503 Service Unavailable error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.serverUnavailable('unavailable');
```

Generates the following response payload:

```json
{
  "statusCode": 503,
  "error": "Service Unavailable",
  "message": "unavailable"
}
```

#### `ctx.response.gatewayTimeout([message], [data])`

Returns a 504 Gateway Time-out error where:
- `message` - optional message.
- `data` - optional additional error data.

```js
ctx.response.gatewayTimeout();
```

Generates the following response payload:

```json
{
  "statusCode": 504,
  "error": "Gateway Time-out"
}
```
