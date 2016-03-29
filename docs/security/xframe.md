---
title: X-Frame
---

Enables `X-Frame-Options` headers to help prevent Clickjacking.

## Configuration

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
