---
title: Source Providers
tags:
  - providers
  - data-transfer
  - experimental
---

# Source Providers

Data transfer source providers provide a standardized interface and streams of data for each stage in a transfer intended to be consumed by destination providers.

The following source providers are available within Strapi:

- [Strapi File](./01-strapi-file.md): loads data from a Strapi data file
- [Local Strapi](./02-local-strapi.md): uses a local Strapi project to retrieve data from its configured database
- [Remote Strapi](./03-remote-strapi.md): accepts a websocket connection to a running instance of Strapi over a network to send data

## Creating your own providers

It is possible to create your own provider by providing the interface defined in ISourceProvider. Please see existing providers (such as the local strapi source provider) for an example.
