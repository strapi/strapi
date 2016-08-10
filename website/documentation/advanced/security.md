# Security

We take security very seriously. This is why Strapi comes with several security layers that just work depending on your needs.

!!! warning
    All security bugs in Strapi are taken seriously and should be reported by emailing [support@strapi.io](mailto:support@strapi.io)
    **Please don't file a public issue.** [Learn more about reporting security issues](../../info/security/index.html).

## CORS

Cross-Origin Resource Sharing (CORS) is a mechanism that allows restricted resources (e.g. fonts, JavaScript, etc.) on a web page to be requested from another domain outside the domain from which the resource originated.

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

## CSRF

Cross Site Request Forgery (CSRF) is a type of attack which forces an end user to execute unwanted actions on a web application backend with which he/she is currently authenticated.

Strapi bundles optional CSRF protection out of the box.

Configuration:

- Key: `csrf`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`

```js
{
  "csrf": {
    "key": "_csrf",
    "secret": "_csrfSecret"
  }
}
```

Options:

- `key` (string): The name of the CSRF token added to the model. Defaults to `_csrf`.
- `secret` (string): The key to place on the session object which maps to the server side token. Defaults to `_csrfSecret`.

Notes:

- Set to `false` to disable CSRF headers.
- If you have existing code that communicates with your Strapi backend via `POST`, `PUT`, or `DELETE` requests, you'll need to acquire a CSRF token and include it as a parameter or header in those requests.

## CSP headers

Content Security Policy (CSP) is a W3C specification for instructing the client browser as to which location and/or which type of resources are allowed to be loaded.

This spec uses "directives" to define a loading behaviors for target resource types. Directives can be specified using HTTP response headers or or HTML Meta tags.

Configuration:

- Key: `csp`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`

Example:

```js
{
  "csp": {
    "policy": {
      "default-src": "self",
      "img-src": "*"
    }
  }
}
```

Options:

- `policy` (object): Object definition of policy.
- `reportOnly` (boolean): Enable report only mode.
- `reportUri` (string): URI where to send the report data.

Notes:

- Set to `false` to disable CSP headers.
- See the [MDN CSP usage page](https://developer.mozilla.org/en-US/docs/Web/Security/CSP/Using_Content_Security_Policy) for more information on available policy options.

## HSTS

Enables HTTP Strict Transport Security for the host domain.

The preload flag is required for HSTS domain submissions to Chrome's HSTS preload list.

Configuration:

- Key: `hsts`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`

Example:

```js
{
  "hsts": {
    "maxAge": 31536000,
    "includeSubDomains": true
  }
}
```

Options:

- `maxAge` (integer): Number of seconds HSTS is in effect.
- `includeSubDomains` (boolean): Applies HSTS to all subdomains of the host.

Notes:

- Set to `false` to disable HSTS.

## P3P

Platform for Privacy Preferences (P3P) is a browser/web standard designed to facilitate better consumer web privacy control. Currently out of all the major browsers, it is only supported by Internet Explorer. It comes into play most often when dealing with legacy applications.

Configuration:

- Key: `p3p`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `string`

Example:

```js
{
  "p3p": "ABCDEF"
}
```

Notes:

- The string is the value of the compact privacy policy.
- Set to `false` to disable P3P.

## X-Frame

Enables `X-Frame-Options` headers to help prevent Clickjacking.

Configuration:

- Key: `xframe`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `string`

Example:

```js
{
  "xframe": "SAMEORIGIN"
}
```

Notes:

- The string is the value for the header: `DENY`, `SAMEORIGIN` or `ALLOW-FROM`.
- Set to `false` to disable X-Frame-Options headers.

## X-XSS

Cross-site scripting (XSS) is a type of attack in which a malicious agent manages to inject client-side JavaScript into your website, so that it runs in the trusted environment of your users' browsers.

Enables `X-XSS-Protection` headers to help prevent cross site scripting (XSS) attacks in older IE browsers (IE8).

Configuration:

- Key: `xssProtection`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`

Example:

```js
{
  "xssProtection": {
    "enabled": true,
    "mode": "block"
  }
}
```

Options:

- `enabled` (boolean): If the header is enabled or not.
- `mode` (string): Mode to set on the header.

Notes:

- Set to `false` to disable HTTP Strict Transport Security.

## IP filtering

The IP filter configuration allows you to whitelist or blacklist specific or range IP addresses.

The blacklisted IP addresses won't have access to your web application at all.

Configuration:

- Key: `ip`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`

Example:

```js
{
  "ip": {
    "whiteList": [
      "192.168.0.*",
      "8.8.8.[0-3]"
    ],
    "blackList": [
      "144.144.*"
    ]
  }
}
```

Options:

- `whiteList` (array): IP addresses allowed.
- `blackList` (array): IP addresses forbidden.

Notes:

- Set to `false` to disable IP filter.

## Proxy

A proxy server is a server that acts as an intermediary for requests from clients seeking resources from other servers.

Request your server, fetch the proxy URL you typed and return.

Configuration:

- Key: `proxy`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `string`

Example:

```js
{
  "proxy": "http://mycdn.com"
}
```

Notes:

- The string will fetch the host and return. For example, when you request `http://localhost:1337/users`, it will fetch `http://mycdn.com/users` and return.
- Set to `false` to disable the proxy security.

## SSL

Secure Sockets Layer (SSL), is a cryptographic protocol designed to provide communications security over a computer network.

This configuration enforce SSL for your application.

Configuration:

- Key: `ssl`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`

Example:

```js
{
  "ssl": {
    "disabled": false,
    "trustProxy": true
  }
}
```

Options:

- `disabled` (boolean): If `true`, this middleware will allow all requests through.
- `trustProxy` (boolean): If `true`, trust the `X-Forwarded-Proto` header.

Notes:

- Set to `false` to disable SSL.
