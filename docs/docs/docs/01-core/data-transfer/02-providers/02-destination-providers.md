---
title: Destination Providers
tags:
  - providers
  - data-transfer
  - experimental
---

# Destination Providers

## Destination provider structure

A destination provider must implement the interface IDestinationProvider found in `packages/core/data-transfer/types/providers.d.ts`.

In short, it provides a set of `create{_stage_}WriteStream()` methods for each stage that provide a Writable stream, which will be passed each entity, link (relation), asset (file), configuration entity, or content type schema (depending on the stage) piped from the Readable source provider stream.
