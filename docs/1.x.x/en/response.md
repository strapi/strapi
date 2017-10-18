# Response

A Strapi `Response` object is an abstraction on top of Node's vanilla response object,
providing additional functionality that is useful for every day HTTP server
development.

## API

### response.header

Response header object.

### response.headers

Response header object. Alias as `response.header`.

### response.socket

Request socket.

### response.status

Get response status. By default, `response.status` is not set unlike Node's
`res.statusCode` which defaults to `200`.

### response.status=

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
- 300 "multiple choices"
- 301 "moved permanently"
- 302 "moved temporarily"
- 303 "see other"
- 304 "not modified"
- 305 "use proxy"
- 307 "temporary redirect"
- 400 "bad request"
- 401 "unauthorized"
- 402 "payment required"
- 403 "forbidden"
- 404 "not found"
- 405 "method not allowed"
- 406 "not acceptable"
- 407 "proxy authentication required"
- 408 "request time-out"
- 409 "conflict"
- 410 "gone"
- 411 "length required"
- 412 "precondition failed"
- 413 "request entity too large"
- 414 "request-uri too large"
- 415 "unsupported media type"
- 416 "requested range not satisfiable"
- 417 "expectation failed"
- 418 "i'm a teapot"
- 422 "unprocessable entity"
- 423 "locked"
- 424 "failed dependency"
- 425 "unordered collection"
- 426 "upgrade required"
- 428 "precondition required"
- 429 "too many requests"
- 431 "request header fields too large"
- 500 "internal server error"
- 501 "not implemented"
- 502 "bad gateway"
- 503 "service unavailable"
- 504 "gateway time-out"
- 505 "http version not supported"
- 506 "variant also negotiates"
- 507 "insufficient storage"
- 509 "bandwidth limit exceeded"
- 510 "not extended"
- 511 "network authentication required"

Don't worry too much about memorizing these strings, if you have a typo an error will be thrown,
displaying this list so you can make a correction.

### response.message

Get response status message. By default, `response.message` is
associated with `response.status`.

### response.message=

Set response status message to the given value.

### response.length=

Set response Content-Length to the given value.

### response.length

Return response Content-Length as a number when present, or deduce
from `this.body` when possible, or `undefined`.

### response.body

Get response body.

### response.body=

Set response body to one of the following:

- `string` written
- `Buffer` written
- `Stream` piped
- `Object` json-stringified
- `null` no content response

If `response.status` has not been set, Strapi will automatically set the status to `200` or `204`.

#### String

The Content-Type is defaulted to text/html or text/plain, both with
a default charset of utf-8. The Content-Length field is also set.

#### Buffer

The Content-Type is defaulted to application/octet-stream, and Content-Length
is also set.

#### Stream

The Content-Type is defaulted to application/octet-stream.

#### Object

The Content-Type is defaulted to application/json.

### response.get(field)

Get a response header field value with case-insensitive `field`.

```js
const etag = this.get('ETag');
```

### response.set(field, value)

Set response header `field` to `value`:

```js
this.set('Cache-Control', 'no-cache');
```

### response.append(field, value)
Append additional header `field` with value `val`.

```js
this.append('Link', '<http://127.0.0.1/>');
```

### response.set(fields)

Set several response header `fields` with an object:

```js
this.set({
  'Etag': '1234',
  'Last-Modified': date
});
```

### response.remove(field)

Remove header `field`.

### response.type

Get response `Content-Type` void of parameters such as "charset".

```js
const ct = this.type;
// => "image/png"
```

### response.type=

Set response `Content-Type` via mime string or file extension.

```js
this.type = 'text/plain; charset=utf-8';
this.type = 'image/png';
this.type = '.png';
this.type = 'png';
```

Note: when appropriate a `charset` is selected for you, for
example `response.type = 'html'` will default to "utf-8", however
when explicitly defined in full as `response.type = 'text/html'`
no charset is assigned.

### response.is(types...)

Very similar to `this.request.is()`.
Check whether the response type is one of the supplied types.
This is particularly useful for creating middleware that
manipulate responses.

For example, this is a middleware that minifies
all HTML responses except for streams.

```js
const minify = require('html-minifier');

strapi.app.use(function *minifyHTML(next) {
  yield next;

  if (!this.response.is('html')) {
    return;
  }

  const body = this.body;
  if (!body || body.pipe) {
    return;
  }

  if (Buffer.isBuffer(body)) {
    body = body.toString();
  }

  this.body = minify(body);
});
```

### response.redirect(url, [alt])

Perform a [302] redirect to `url`.

The string "back" is special-cased
to provide Referrer support, when Referrer
is not present `alt` or "/" is used.

```js
this.redirect('back');
this.redirect('back', '/index.html');
this.redirect('/login');
this.redirect('http://google.com');
```

To alter the default status of `302`, simply assign the status
before or after this call. To alter the body, assign it after this call:

```js
this.status = 301;
this.redirect('/cart');
this.body = 'Redirecting to shopping cart';
```

### response.attachment([filename])

Set `Content-Disposition` to "attachment" to signal the client
to prompt for download. Optionally specify the `filename` of the
download.

### response.headerSent

Check if a response header has already been sent. Useful for seeing
if the client may be notified on error.

### response.lastModified

Return the `Last-Modified` header as a `Date`, if it exists.

### response.lastModified=

Set the `Last-Modified` header as an appropriate UTC string.
You can either set it as a `Date` or date string.

```js
this.response.lastModified = new Date();
```

### response.etag=

Set the ETag of a response including the wrapped `"`s.
Note that there is no corresponding `response.etag` getter.

```js
this.response.etag = crypto.createHash('md5').update(this.body).digest('hex');
```

### response.vary(field)

Vary on `field`.
