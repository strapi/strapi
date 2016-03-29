---
title: CORS
---

Cross-Origin Resource Sharing (CORS) is a mechanism that allows restricted resources (e.g. fonts, JavaScript, etc.) on a web page to be requested from another domain outside the domain from which the resource originated.

## Configuration

Configuration:

- Key: `cors`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`

Example:

```js
{
  "cors": {
    "origin": true,
    "expose": [
      "WWW-Authenticate",
      "Server-Authorization"
    ],
    "maxAge": 31536000,
    "credentials": true,
    "methods": [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
      "HEAD"
    ],
    "headers": [
      "Content-Type",
      "Authorization"
    ]
  }
}
```

Options:

- `origin` (string|boolean): Configures the `Access-Control-Allow-Origin` CORS header. Expects a string (ex: `http://example.com`) or a boolean. Set to `true` to reflect the request origin, as defined by `req.header('Origin')`. Set to `false` to disable CORS.
- `expose` (array): Configures the `Access-Control-Expose-Headers` CORS header. Set this to pass the header, otherwise it is omitted.
- `maxAge` (integer): Configures the `Access-Control-Max-Age` CORS header. Set to an integer to pass the header, otherwise it is omitted.
- `credentials` (boolean): Configures the `Access-Control-Allow-Credentials` CORS header. Set to `true` to pass the header, otherwise it is omitted.
- `methods` (array): Configures the `Access-Control-Allow-Methods` CORS header.
- `headers` (array): Configures the `Access-Control-Allow-Headers` CORS header. If not specified, defaults to reflecting the headers specified in the request's `Access-Control-Request-Headers` header.

Notes:

- Set to `false` to disable CORS.
