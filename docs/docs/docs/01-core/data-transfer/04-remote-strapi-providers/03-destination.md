---
title: Remote Destination Provider
tags:
  - providers
  - data-transfer
  - experimental
---

# Strapi Remote Destination Provider

The Strapi remote destination provider connects to a remote Strapi websocket server and sends messages to move between stages and push data.

## Provider Options

The remote destination provider accepts the same `restore` and `strategy` options from local Strapi destination provider, plus `url` and `auth` options described below.

```typescript
interface ITransferTokenAuth {
  type: 'token'; // the name of the auth strategy
  token: string; // the transfer token
}

export interface IRemoteStrapiDestinationProviderOptions
  extends Pick<ILocalStrapiDestinationProviderOptions, 'restore' | 'strategy'> {
  url: URL; // the url of the remote Strapi admin
  auth?: ITransferTokenAuth;
}
```

Note: `url` must include the protocol `https` or `http` which will then be converted to `wss` or `ws` to make the connection. A secure connection is strongly recommended, especially given the high access level that the transfer token provides.
