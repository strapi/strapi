---
title: HSTS
---

Enables HTTP Strict Transport Security for the host domain.

The preload flag is required for HSTS domain submissions to Chrome's HSTS preload list.

## Configuration

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
