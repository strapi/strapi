---
title: Body parser
---

The "body parser" extracts the entire body portion of an incoming request stream and exposes it as something easier to interface with. It will most likely do what you want and save you the trouble.

## Configuration

Configuration:

- Key: `parser`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `object`

Example:

```js
{
  "parser": {
    "encode": "utf-8",
    "formLimit": "56kb",
    "jsonLimit": "1mb",
    "strict": true,
    "extendTypes": {
      "json": [
        "application/x-javascript"
      ]
    }
  }
}
```

Options:

- `encode` (string): Requested encoding.
- `formLimit` (string): Limit of the urlencoded body. If the body ends up being larger than this limit, a 413 error code is returned.
- `jsonLimit` (string): Limit of the JSON body.
- `strict` (boolean): When set to `true`, JSON parser will only accept arrays and objects.
- `extendTypes` (array): Support extend types.

Notes:

- Set to `false` to disable the body parser (not recommended).
