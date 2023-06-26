---
title: Remote Provider Websocket
tags:
  - providers
  - data-transfer
  - experimental
---

# Remote Provider Websocket

When the data transfer feature is enabled for a Strapi server (an `admin.transfer.token.salt` config value has been set and STRAPI_DISABLE_REMOTE_DATA_TRANSFER is not set to true), Strapi will create websocket servers available on the routes `/admin/transfer/runner/pull` and `/admin/transfer/runner/push`.

Opening a websocket connection on those routes requires a valid transfer token as a bearer token in the Authorization header.

Please see the `bootstrap()` method of the remote providers for an example of how to make the initial connection to the Strapi websocket.

## Websocket Messages

After connecting to the websocket.

### Initialization Messages

** TODO **

### Pull Messages

** TODO **

### Push Messages

** TODO **

See `packages/core/data-transfer/dist/strapi/remote/handlers/push.d.ts` and `packages/core/data-transfer/dist/strapi/remote/handlers/push.d.ts`

## Message Timeouts and Retries

Because the transfer uses on a message->response protocol, if the websocket server is unable to send a reply, for example due to network instability, the connection would halt. For this reason, each provider's options includes `retryMessageOptions` which attempt to resend a message after a given timeout is reached and a max retry option to give up after a given number of failed retry attempts.
