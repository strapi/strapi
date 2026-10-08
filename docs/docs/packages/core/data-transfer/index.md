---
title: '@strapi/data-transfer'
sidebar_label: 'data-transfer'
description: 'Streaming engine and providers that export, import and transfer Strapi data between files, directories and instances.'
package: '@strapi/data-transfer'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

`@strapi/data-transfer` moves the data of a Strapi application from one place to another. A transfer engine reads from a source provider and writes to a destination provider, stage by stage, as streams. This gives the `export`, `import` and `transfer` commands. It runs on the server and in the CLI process.

The `@strapi/strapi` package uses it for the CLI commands. The `@strapi/admin` server uses its remote handlers for the push and pull routes and the transfer tokens. Users of the commands rely on it to back up, restore and copy content between environments.

## Key concepts

### Transfer engine

`TransferEngine` in [`src/engine`](https://github.com/strapi/strapi/tree/develop/packages/core/data-transfer/src/engine) takes a source and a destination provider and runs the transfer. The order is: bootstrap and init the providers, run the integrity check, validate the stages, run `beforeTransfer` on the providers, transfer the stages, then close. If an error occurs before close, the engine calls `rollback` on the destination. Read [Transfer engine](./01-engine/index.md) and [Stream lifecycle](./01-engine/02-stream-lifecycle.md).

### Stages

A transfer has five stages: `schemas`, `entities`, `assets`, `links` and `configuration`. The engine runs them in that order. The `only` and `exclude` options select stages through the presets `content`, `files` and `config`. A provider offers one stream factory per stage, for example `createEntitiesReadStream`.

### Providers

A provider implements `ISourceProvider` or `IDestinationProvider` from [`src/types/providers.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/data-transfer/src/types/providers.ts). Both extend `IProvider` with `bootstrap`, `close`, `getMetadata`, `getSchemas` and `beforeTransfer`. Read the [providers overview](./02-providers/00-overview.md), [source providers](./02-providers/01-source-providers.md) and [destination providers](./02-providers/02-destination-providers.md).

### Provider families

The package ships four families, each with a source and a destination:

- Strapi file: an archive of JSON Lines files, with optional gzip compression and encryption. See [Strapi file](./02-providers/03-strapi-file/00-overview.md).
- Directory: the same layout, unpacked in a folder. The CLI `export` command uses it with `--format dir`. The `import` command uses it when the path is a directory. Code: [`src/directory`](https://github.com/strapi/strapi/tree/develop/packages/core/data-transfer/src/directory).
- Local Strapi: reads and writes the database of the running application. See [Local Strapi](./02-providers/04-local-strapi/00-overview.md).
- Remote Strapi: wraps the local providers behind a WebSocket connection to another instance. See [Remote Strapi](./02-providers/05-remote-strapi/00-overview.md) and [WebSocket protocol](./02-providers/05-remote-strapi/01-websocket.md).

### Restore strategy

The local destination provider has one conflict strategy, `restore`. Before it writes, `beforeTransfer` deletes the existing records and media files that match the transfer scope. A transfer into a Strapi instance is destructive. Read [Local Strapi destination](./02-providers/04-local-strapi/02-destination.md).

### Integrity checks

Before data flows, the engine compares the Strapi versions and the schemas of both sides. The `versionStrategy` and `schemaStrategy` options decide what counts as a mismatch. The engine defaults are `ignore` for versions and `strict` for schemas. An `onSchemaDiff` handler can resolve a difference. Code: [`src/engine/validation`](https://github.com/strapi/strapi/tree/develop/packages/core/data-transfer/src/engine/validation).

### Transfer policy

[`src/strapi/transfer-policy.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/data-transfer/src/strapi/transfer-policy.ts) lists content types that a transfer skips. It skips all `admin::` types and the two `content-releases` types (`release` and `release-action`).

### Remote handlers

`src/strapi/remote/handlers` builds the push and pull controllers with `createPushController` and `createPullController`. The `@strapi/admin` server mounts them on the routes `/transfer/runner/push` and `/transfer/runner/pull`. A transfer token authorizes each call.

## Related

- [Package map](../../../architecture/01-package-map.mdx): how the CLI, admin and data-transfer packages depend on each other.
- [Authentication](../../../architecture/08-authentication.md): the transfer token strategy of the admin server.
- [HTTP request path](../../../architecture/06-http-request-path.md): how the remote routes reach a controller.
- [`@strapi/strapi`](../strapi/index.md): the `export`, `import` and `transfer` CLI commands.
- [`@strapi/admin`](../admin/index.md): the runner routes and the transfer tokens.
- [`@strapi/database`](../database/index.md): the local providers read and write through `strapi.db` and disable its lifecycles during a transfer.
