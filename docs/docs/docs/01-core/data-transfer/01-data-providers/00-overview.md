---
title: Destination Providers
tags:
  - providers
  - data-transfer
  - experimental
---

# Data Providers

Data providers are the interfaces for streaming data during a transfer. Source providers provide read streams and destination providers provide write streams which the transfer engine pipes (and optionally transforms) during a transfer.

Strapi provides both source and destination providers for the following:

- [Strapi file](../03-file-providers/00-overview.md): a standardized file format designed for the transfer process
- [Local Strapi]: a connection to a local Strapi project which uses its configured database connection to manage data
- [Remote Strapi]: a wrapper of local Strapi provider that adds a websocket interface to a running remote (network) instance of Strapi

## Creating your own providers

It is possible to create your own providers by implementing the interface(s) defined in ISourceProvider and IDestinationProvider. It is not necessary to create both a source and destination provider, only the part necessary for your use.

For examples, see the existing providers such as the local Strapi provider.
