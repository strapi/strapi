---
title: CSP headers
---

Content Security Policy (CSP) is a W3C specification for instructing the client browser as to which location and/or which type of resources are allowed to be loaded.

This spec uses "directives" to define a loading behaviors for target resource types. Directives can be specified using HTTP response headers or or HTML Meta tags.

## Configuration

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
