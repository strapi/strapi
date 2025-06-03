---
title: Introduction
tags:
  - providers
  - data-transfer
  - experimental
---

# Data Transfer Providers

Data transfer providers are the interfaces for streaming data during a transfer.

[Source providers](./01-source-providers.md) provide read streams for each stage in the transfer.

[Destination providers](./02-destination-providers.md) provide write streams for each stage in the transfer.

Strapi provides both source and destination providers for the following:

- [Strapi file](./03-strapi-file/00-overview.md): a standardized file format designed for the transfer process
- [Local Strapi](./04-local-strapi/00-overview.md): a connection to a local Strapi project which uses its configured database connection to manage data
- [Remote Strapi](./05-remote-strapi/00-overview.md): a wrapper of local Strapi provider that adds a websocket interface to a running remote (network) instance of Strapi

Each provider must provide the same interface for transferring data, but will usually include its own unique set of options to be passed in when initializing the provider.

## Creating your own providers

To create your own providers, you must implement the interface(s) defined in `ISourceProvider` and `IDestinationProvider` found in `packages/core/data-transfer/types/providers.d.ts`.

It is not necessary to create both a source and destination provider, only the part necessary for your use.

For examples, see the existing providers such as the local Strapi provider.

## Asset Transfers

Currently, all of the data-transfer providers only handle local media assets (the `/upload` folder). Provider media is currently in development. Therefore, everything related to asset transfers -- including Strapi file structure, restore strategy, and rollback for assets -- is currently treated as `unstable` and likely to change in the near future.
