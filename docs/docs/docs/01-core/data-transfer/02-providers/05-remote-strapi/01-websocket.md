---
title: Websocket
tags:
  - providers
  - data-transfer
  - experimental
---

# Remote Provider Websocket

When the data transfer feature is enabled for a Strapi server (an `admin.transfer.token.salt` config value has been set and `server.transfer.remote.enabled` is not set to false), Strapi will create websocket servers available on the routes `/admin/transfer/runner/pull` and `/admin/transfer/runner/push`.

Opening a websocket connection on those routes requires a valid transfer token as a bearer token in the Authorization header.

Please see the `bootstrap()` method of the remote providers for an example of how to make the initial connection to the Strapi websocket.

## Websocket Messages / Dispatcher

The remote websocket server only accepts specific websocket messages which we call transfer commands. These commands must also be sent in a specific order, and an error messages will be returned if an unexpected message is received by the server.

A message dispatcher object should be created to send messages to the server. See `packages/core/data-transfer/src/strapi/providers/utils.ts` for more inofrmation on the dispatcher.

The dispatcher includes

### dispatchCommand

Accepts "commands" used for opening and closing a transfer.

Allows the following `command` values:

- `init`: for initializing a connection. Returns a transferID that must be sent with all future messages in this transfer
- `end`: for ending a connection

### dispatchTransferStep

Used for switching between stages of a transfer and streaming the actual data of a transfer.

Accepts the following `action` values:

- `start`: sent with a `step` value for the name of the step/stage
  - any number of `stream`: sent with a `step` value and the `data` being sent (ie, an array of entities)
- `end`: sent with a `step` value for the step being ended

### dispatchTransferAction

Used for triggering 'actions' on the server equivalent to the local providers.

- `bootstrap`
- `getMetadata`
- `beforeTransfer`
- `getSchemas`
- `rollback` (destination only)
- `close`: for completing a transfer (but doesn't close the connection)

See `packages/core/data-transfer/dist/strapi/remote/handlers/push.d.ts` and `packages/core/data-transfer/dist/strapi/remote/handlers/push.d.ts` for complete and precise definitions of the messages that must be sent.

## Message Timeouts and Retries

Because the transfer relies on a message->response protocol, if the websocket server is unable to send a reply, for example due to network instability, the connection would halt. For this reason, each provider's options includes `retryMessageOptions` which attempt to resend a message after a given timeout is reached and a max retry option to abort the transfer after a given number of failed retry attempts.
