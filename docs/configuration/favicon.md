---
title: Favicon
---

A favicon is a file containing one small icon, most commonly 16×16 pixels, for your website.

## Configuration

Configuration:

- Key: `favicon`
- Environment: all
- Location: `./config/general.json`
- Type: `object`

Example:

```js
{
  "favicon": {
    "path": "favicon.ico",
    "maxAge": 86400000
  }
}
```

Options:

- `path` (string): Relative path for the favicon to use from the application root directory.
- `maxAge` (integer): Cache-control max-age directive. Set to pass the cache-control in ms.

Notes:

- Set to `false` to disable the favicon feature.
