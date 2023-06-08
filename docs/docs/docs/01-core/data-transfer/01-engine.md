---
title: Transfer Engine
description: Conceptual guide to the data transfer engine
tags:
  - data-transfer
  - experimental
---

The transfer engine manages the data transfer process by facilitating communication between a source provider and a destination provider.

## Code location

`packages/core/data-transfer/src/engine/index.ts`

## Setting up the transfer engine

A transfer engine object is created by using `createTransferEngine`, which accepts a [source provider](./source-providers/overview), a [destination provider](./destination-providers/overview), and an options object.

Note: By default, a transfer engine will transfer ALL data, including admin data, api tokens, etc. Transform filters must be used if you wish to exclude, as seen in the example below. An array called `DEFAULT_IGNORED_CONTENT_TYPES` is available from @strapi/data-transfer containing the uids that are excluded by default from the import, export, and transfer commands. If you intend to transfer admin data, be aware that this behavior will likely change in the future to automatically exclude the entire `admin::` uid namespace and will instead require them to be explicitly included.

```typescript
const engine = createTransferEngine(source, destination, options);
```

### Engine Options

An example of every option:

```typescript
const options = {
  versionStrategy: 'ignore', // see versionStragy documentation
  schemaStrategy: 'strict', // see schemaStragey documentation
  exclude: [], // exclude these classifications of data; see CLI documentation of `--exclude` for list
  only: [], // transfer only these classifications of data; see CLI documentation of `--only` for list
  throttle: 0, // add a delay of this many millseconds between each item transferred
  transforms: {
    links: [
      {
        // exclude all relations to ignored content types
        filter(link) {
          return (
            !DEFAULT_IGNORED_CONTENT_TYPES.includes(link.left.type) &&
            !DEFAULT_IGNORED_CONTENT_TYPES.includes(link.right.type)
          );
        },
      },
    ],
    entities: [
      {
        // exclude all ignored content types
        filter(entity) {
          return !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type);
        },
      },
    ],
  },
};
```

#### versionStrategy

**TODO**

#### schemaStrategy

**TODO**

### Handling Schema differences

The transfer engine allows you to add listeners for managing differences in schema between the source and destination using `engine.onSchemaDiff(handler)`

**TODO**

### Progress Tracking events

The transfer engine allows you to add event listeners to track the progress of your transfer.

```typescript
engine.progress.stream;
```

### Diagnostics events

`engine.diagnostics.onDiagnostic(formatDiagnostic('export'));`

**TODO**

### Transforms

Transforms allow you to manipulate the data that is sent from the source before it reaches the destination.

## Filters (excluding data)

**TODO**

## Map (modifying data)

**TODO**

## Running a transfer

Note: The transfer engine (and the providers) current only support a single `engine.transfer()` and must be re-instantiated if intended to run multiple times. In the future it is expected to allow them to be used for multiple transfers in a row, but that usage is untested and will result in unpredictable behavior.
