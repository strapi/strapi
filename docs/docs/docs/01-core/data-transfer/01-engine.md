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

An example of every available option:

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

##### Handling Schema differences

Instead of aborting on schema validation errors, the transfer engine allows you to add listeners for managing differences in schema between the source and destination using `engine.onSchemaDiff(handler)`

**TODO**

### Progress Tracking events

The transfer engine allows tracking the progress of your transfer either directly with the engine.progress.data object, or with listeners using the engine.progress.stream PassThrough stream. The engine.progress.data object definition is of type TransferProgress.

Here is an example that logs a message at the beginning and end of each stage, as well as a message after each item has been transferred

```typescript
const progress = engine.progress.stream;

progress.on(`stage::start`, ({ stage, data }) => {
  console.log(`${stage} has started at ${data[stage].startTime}`);
});

progress.on('stage::finish', ({ stage, data }) => {
  console.log(`${stage} has finished at ${data[stage].endTime}`);
});

progress.on('stage::progress', ({ stage, data }) => {
  console.log('Transferred ${data[stage].bytes} bytes / ${data[stage].count} entities');
});
```

Note: There is currently no way for a source provider to give a "total" number of records expected to be transferred, but it is expected in a future update.

The following events are available:

`stage::start` - at the start of each stage
`stage::finish` - at the end of each stage
`stage::progress` - after each entitity in that stage has been transferred
`stage::skip` - when an entire stage is skipped (eg, when 'only' or 'exclude' are used)
`stage::error` - when there is an error thrown during a stage
`transfer::init` - at the very beginning of engine.transfer()
`transfer::start` - after bootstrapping and initializing the providers, when the transfer is about to start
`transfer::finish` - when the transfer has finished
`transfer::error` - when there is an error thrown during the transfer

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

Running a transfer simply involves calling the asynchrounous engine.transfer() method.

```typescript
const engine = createTransferEngine(source, destination, options);
try {
  await engine.transfer();
} catch (e) {
  console.error('Something went wrong: ', e?.message);
}
```

Be aware that engine.transfer() throws on any fatal errors it encounters.

Note: The transfer engine (and the providers) current only support a single `engine.transfer()` and must be re-instantiated if intended to run multiple times. In the future it is expected to allow them to be used for multiple transfers in a row, but that usage is untested and will result in unpredictable behavior.
