---
title: Overview
tags:
  - experimental
  - providers
  - import
  - export
  - data-transfer
---

# Remote Strapi Providers

Remote Strapi providers connect to an instance of Strapi over a network using a websocket.

Internally, the remote Strapi providers map websocket requests to a local Strapi provider of the instance it is running in.

In order to use remote transfer providers, the remote Strapi server must have a value for `transfer.token.salt` configured in `config/admin.js` and the remote transfer feature must not be disabled.

## Disabling Remote Transfers

The remote transfer feature of a server can be completely disabled by setting the server config value:

```javascript
// in config/server.js
{
  transfer: {
    remote: {
      enabled: false;
    }
  }
  // ...the rest of your server config
}
```
