---
title: SSL
---

Secure Sockets Layer (SSL), is a cryptographic protocol designed to provide communications security over a computer network.

This configuration enforce SSL for your application.

## Configuration

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
