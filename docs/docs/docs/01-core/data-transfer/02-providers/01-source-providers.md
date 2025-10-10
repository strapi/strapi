---
title: Source Providers
tags:
  - providers
  - data-transfer
  - experimental
---

# Source Providers

## Source provider structure

A source provider must implement the interface ISourceProvider found in `packages/core/data-transfer/types/providers.d.ts`.

In short, it provides a set of `create{_stage_}ReadStream()` methods for each stage that provide a Readable stream, which will retrieve its data (ideally from its own stream) and then perform a `stream.write(entity)` for each entity, link (relation), asset (file), configuration entity, or content type schema depending on the stage.

When each stage's stream has finished sending all the data, the stream must be closed before the transfer engine will continue to the next stage.
