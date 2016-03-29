---
title: X-XSS
---

Cross-site scripting (XSS) is a type of attack in which a malicious agent manages to inject client-side JavaScript into your website, so that it runs in the trusted environment of your users' browsers.

Enables `X-XSS-Protection` headers to help prevent cross site scripting (XSS) attacks in older IE browsers (IE8).

## Configuration

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
