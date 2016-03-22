---
title: IP filtering
---

The IP filter configuration allows you to whitelist or blacklist specific or range IP addresses.

The blacklisted IP addresses won't have access to your web application at all.

## Configuration

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
