---
title: Proxy
---

A proxy server is a server that acts as an intermediary for requests from clients seeking resources from other servers.

Request your server, fetch the proxy URL you typed and return.

## Configuration

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
