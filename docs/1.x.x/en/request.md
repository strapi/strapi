# Request

A Strapi `Request` object is an abstraction on top of Node's vanilla request object,
providing additional functionality that is useful for every day HTTP server
development.

## API

### request.header

Request header object.

### request.headers

Request header object. Alias as `request.header`.

### request.method

Request method.

### request.method=

Set request method, useful for implementing middleware
such as `methodOverride()`.

### request.length

Return request Content-Length as a number when present, or `undefined`.

### request.url

Get request URL.

### request.url=

Set request URL, useful for url rewrites.

### request.originalUrl

Get request original URL.

### request.origin

Get origin of URL, include `protocol` and `host`.

```js
this.request.origin
// => http://example.com
```

### request.href

Get full request URL, include `protocol`, `host` and `url`.

```js
this.request.href
// => http://example.com/foo/bar?q=1
```

### request.path

Get request pathname.

### request.path=

Set request pathname and retain query-string when present.

### request.querystring

Get raw query string void of `?`.

### request.querystring=

Set raw query string.

### request.search

Get raw query string with the `?`.

### request.search=

Set raw query string.

### request.host

Get host (hostname:port) when present. Supports `X-Forwarded-Host`
when `strapi.app.proxy` is `true`, otherwise `Host` is used.

### request.hostname

Get hostname when present. Supports `X-Forwarded-Host`
when `strapi.app.proxy` is `true`, otherwise `Host` is used.

### request.type

Get request `Content-Type` void of parameters such as "charset".

```js
const ct = this.request.type;
// => "image/png"
```

### request.charset

Get request charset when present, or `undefined`:

```js
this.request.charset
// => "utf-8"
```

### request.query

Get parsed query-string, returning an empty object when no
query-string is present. Note that this getter does _not_
support nested parsing.

For example "color=blue&size=small":

```js
{
  color: 'blue',
  size: 'small'
}
```

### request.query=

Set query-string to the given object. Note that this
setter does _not_ support nested objects.

```js
this.query = { next: '/login' };
```

### request.fresh

Check if a request cache is "fresh", aka the contents have not changed. This
method is for cache negotiation between `If-None-Match` / `ETag`, and
`If-Modified-Since` and `Last-Modified`. It should be referenced after setting
one or more of these response headers.

```js
// freshness check requires status 20x or 304
this.status = 200;
this.set('ETag', '123');

// cache is ok
if (this.fresh) {
  this.status = 304;
  return;
}

// cache is stale
// fetch new data
this.body = yield db.find('something');
```

### request.stale

Inverse of `request.fresh`.

### request.protocol

Return request protocol, "https" or "http". Supports `X-Forwarded-Proto`
when `strapi.app.proxy` is `true`.

### request.secure

Shorthand for `this.protocol == "https"` to check if a request was
issued via TLS.

### request.ip

Request remote address. Supports `X-Forwarded-For` when `strapi.app.proxy`
is `true`.

### request.ips

When `X-Forwarded-For` is present and `strapi.app.proxy` is enabled an array
of these ips is returned, ordered from upstream -> downstream. When disabled
an empty array is returned.

### request.subdomains

Return subdomains as an array.

Subdomains are the dot-separated parts of the host before the main domain of
the app. By default, the domain of the app is assumed to be the last two
parts of the host. This can be changed by setting `strapi.app.subdomainOffset`.

For example, if the domain is "tobi.ferrets.example.com":
If `strapi.app.subdomainOffset` is not set, this.subdomains is `["ferrets", "tobi"]`.
If `strapi.app.subdomainOffset` is 3, this.subdomains is `["tobi"]`.

### request.is(types...)

Check if the incoming request contains the "Content-Type"
header field, and it contains any of the give mime `type`s.
If there is no request body, `undefined` is returned.
If there is no content type, or the match fails `false` is returned.
Otherwise, it returns the matching content-type.

```js
// With Content-Type: text/html; charset=utf-8
this.is('html'); // => 'html'
this.is('text/html'); // => 'text/html'
this.is('text/*', 'text/html'); // => 'text/html'

// When Content-Type is application/json
this.is('json', 'urlencoded'); // => 'json'
this.is('application/json'); // => 'application/json'
this.is('html', 'application/*'); // => 'application/json'

this.is('html'); // => false
```

For example if you want to ensure that
only images are sent to a given route:

```js
if (this.is('image/*')) {
  // process
} else {
  this.throw(415, 'images only!');
}
```

### Content Negotiation

Strapi's `request` object includes helpful content negotiation utilities powered by
[accepts](http://github.com/expressjs/accepts) and
[negotiator](https://github.com/federomero/negotiator).

These utilities are:

- `request.accepts(types)`
- `request.acceptsEncodings(types)`
- `request.acceptsCharsets(charsets)`
- `request.acceptsLanguages(langs)`

If no types are supplied, all acceptable types are returned.

If multiple types are supplied, the best match will be returned. If no matches are found,
a `false` is returned, and you should send a `406 "Not Acceptable"` response to the client.

In the case of missing accept headers where any type is acceptable, the first type will
be returned. Thus, the order of types you supply is important.

### request.accepts(types)

Check if the given `type(s)` is acceptable, returning the best match when true, otherwise
`false`. The `type` value may be one or more mime type string
such as "application/json", the extension name
such as "json", or an array `["json", "html", "text/plain"]`.

```js
// Accept: text/html
this.accepts('html');
// => "html"

// Accept: text/*, application/json
this.accepts('html');
// => "html"
this.accepts('text/html');
// => "text/html"
this.accepts('json', 'text');
// => "json"
this.accepts('application/json');
// => "application/json"

// Accept: text/*, application/json
this.accepts('image/png');
this.accepts('png');
// => false

// Accept: text/*;q=.5, application/json
this.accepts(['html', 'json']);
this.accepts('html', 'json');
// => "json"

// No Accept header
this.accepts('html', 'json');
// => "html"
this.accepts('json', 'html');
// => "json"
```

You may call `this.accepts()` as many times as you like,
or use a switch:

```js
switch (this.accepts('json', 'html', 'text')) {
  case 'json': break;
  case 'html': break;
  case 'text': break;
  default: this.throw(406, 'json, html, or text only');
}
```

### request.acceptsEncodings(encodings)

Check if `encodings` are acceptable, returning the best match when true, otherwise `false`.
Note that you should include `identity` as one of the encodings!

```js
// Accept-Encoding: gzip
this.acceptsEncodings('gzip', 'deflate', 'identity');
// => "gzip"

this.acceptsEncodings(['gzip', 'deflate', 'identity']);
// => "gzip"
```

When no arguments are given all accepted encodings
are returned as an array:

```js
// Accept-Encoding: gzip, deflate
this.acceptsEncodings();
// => ["gzip", "deflate", "identity"]
```

Note that the `identity` encoding (which means no encoding) could be unacceptable if
the client explicitly sends `identity;q=0`. Although this is an edge case, you should
still handle the case where this method returns `false`.

### request.acceptsCharsets(charsets)

Check if `charsets` are acceptable, returning
the best match when true, otherwise `false`.

```js
// Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5
this.acceptsCharsets('utf-8', 'utf-7');
// => "utf-8"

this.acceptsCharsets(['utf-7', 'utf-8']);
// => "utf-8"
```

When no arguments are given all accepted charsets
are returned as an array:

```js
// Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5
this.acceptsCharsets();
// => ["utf-8", "utf-7", "iso-8859-1"]
```

### request.acceptsLanguages(langs)

Check if `langs` are acceptable, returning
the best match when true, otherwise `false`.

```js
// Accept-Language: en;q=0.8, es, pt
this.acceptsLanguages('es', 'en');
// => "es"

this.acceptsLanguages(['en', 'es']);
// => "es"
```

When no arguments are given all accepted languages
are returned as an array:

```js
// Accept-Language: en;q=0.8, es, pt
this.acceptsLanguages();
// => ["es", "pt", "en"]
```

### request.idempotent

Check if the request is idempotent.

### request.socket

Return the request socket.

### request.get(field)

Return request header.
