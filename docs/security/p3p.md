---
title: P3P
---

Platform for Privacy Preferences (P3P) is a browser/web standard designed to facilitate better consumer web privacy control. Currently out of all the major browsers, it is only supported by Internet Explorer. It comes into play most often when dealing with legacy applications.

## Configuration

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
