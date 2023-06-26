---
title: Strapi Remote Source Provider
tags:
  - providers
  - data-transfer
  - experimental
---

# Strapi Remote Source Provider

The Strapi remote source provider connects to a remote Strapi websocket server and sends messages to move between stages and pull data.

## Provider Options

The remote source provider accepts a `url` and `auth` options described below.

```typescript
interface ITransferTokenAuth {
  type: 'token';
  token: string;
}

export interface IRemoteStrapiDestinationProviderOptions
  extends Pick<ILocalStrapiDestinationProviderOptions, 'restore' | 'strategy'> {
  url: URL;
  auth?: ITransferTokenAuth;
}
```

Note: `url` must include the protocol `https` or `http` which will then be converted to `wss` or `ws` to make the connection. A secure connection is strongly recommended, especially given the high access level that the transfer token provides.
