---
title: Remote Strapi Providers
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

## Websocket Server

When the data transfer feature is enabled for a Strapi server (a transfer token salt has been set on the server and STRAPI_DISABLE_REMOTE_DATA_TRANSFER is not set to true), Strapi will create websocket servers available on the routes `/admin/transfer/runner/pull` and `/admin/transfer/runner/push`.

Opening a websocket connection on those routes requires a valid transfer token as a bearer token in the Authorization header.
