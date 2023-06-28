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

## The transfer process

A transfer starts by bootstrapping and initializing itself and the providers. That is the stage where providers attempt to make any necessary connections to files, databases, websockets, etc.

After that, the integrity check between the source and destination is run, which validates the requirements set by the chosen schemaStrategy and versionStrategy.

Note: Schema differences during this stage can be resolved programmatically by adding an `onSchemaDiff` handler. However, be aware that this interface is likely to change to a more generic engine handler (such as `engine.on('schemaDiff', handler)`) before this feature is stable.

Once the integrity check has passed, the transfer begins by opening streams from the source to the destination one stage at a time. The following is a list of the stages in the order they are run:

1. schemas - content type schemas. Note: with all built-in Strapi destination providers, only the Strapi file provider makes use of this data
2. entities - all entities (including components, dynamic zones, and media data but not media files) _without their relations_
3. assets - the files from the /uploads folder
4. links - the relations between entities
5. configuration - the Strapi project configuration data

Once all stages have been completed, the transfer waits for all providers to close and then emits a finish event and the transfer completes.

## Setting up the transfer engine

A transfer engine object is created by using `createTransferEngine`, which accepts a [source provider](./02-providers/01-source-providers.md), a [destination provider](./02-providers/02-destination-providers.md), and an options object.

Note: By default, a transfer engine will transfer ALL data, including admin data, api tokens, etc. Transform filters must be used if you wish to exclude, as seen in the example below. An array called `DEFAULT_IGNORED_CONTENT_TYPES` is available from @strapi/data-transfer containing the uids that are excluded by default from the import, export, and transfer commands. If you intend to transfer admin data, be aware that this behavior will likely change in the future to automatically exclude the entire `admin::` uid namespace and will instead require them to be explicitly included.

```typescript
const engine = createTransferEngine(source, destination, options);
```

### Engine Options

An example using every available option:

```typescript
const options = {
  versionStrategy: 'ignore', // see versionStragy documentation
  schemaStrategy: 'strict', // see schemaStragey documentation
  exclude: [], // exclude these classifications of data; see CLI documentation of `--exclude` for list
  only: [], // transfer only these classifications of data; see CLI documentation of `--only` for list
  throttle: 0, // add a delay of this many millseconds between each item transferred

  // the keys of `transforms` are the stage names for which they are run
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
      // Note: map exists for links but is not recommended
    ],
    entities: [
      {
        // exclude all ignored content types
        filter(entity) {
          return !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type);
        },
      },
      {
        map(entity) {
          // remove somePrivateField from privateThing entities
          if (entity.type === 'api::privateThing.privateThing') {
            entity.somePrivateField = undefined;
          }

          return entity;
        },
      },
    ],
  },
};
```

#### versionStrategy

The following `versionStrategy` values may be used:

`'ignore'` - allow transfer between any versions of Strapi
`'exact'` - require an exact version match (including tags such as -alpha and -beta)
`'major'` - require only the semver major version to match (but allow minor, patch, and tag to differ)
`'minor'` - require only the semver major and minor versions to match (but allow patch to differ)
`'patch'` - require only the semver major, minor, and patch version to match (but allow tag differences such as -alpha and -beta)

The default `versionStrategy` used when one is not provided is `'ignore'`.

#### schemaStrategy

The follow `schemaStrategy` values may be used:

`'ignore'` - bypass schema validation (transfer will attempt to run but throw errors on incompatible data type inserts)
`'strict'` - disallow mismatches that are expected to cause errors in the transfer, but allow certain non-data fields in the schema to differ
`'exact'` - schema must be identical with no changes

Note: The "strict" schema strategy is defined as "anything expected to cause errors in the transfer" and is the default method for the import, export, and transfer CLI commands. Therefore, the technical functionality will always be subject to change. If you need to find the definition for the current version of Strapi, see `packages/core/data-transfer/src/engine/validation/schemas/index.ts`

The default `schemaStrategy` used when one is not provided is `'strict'`.

##### Handling Schema differences

When a schema diff is discovered with a given schemaStrategy, an error is throw. However, before throwing the error the engine checks to see if there are any schema diff handlers set via `engine.onSchemaDiff(handler)` which allows errors to be bypassed (for example, by prompting the user if they wish to proceed).

A diff handler is an optionally asynchronous middleware function that accepts a `context` and a `next` parameter.

`context` is an object of type `SchemaDiffHandlerContext`

```typescript
// type Diff can be found in /packages/core/data-transfer/src/utils/json.ts
type SchemaDiffHandlerContext = {
  ignoredDiffs: Record<string, Diff[]>;
  diffs: Record<string, Diff[]>;
  source: ISourceProvider;
  destination: IDestinationProvider;
};
```

`next` is a function that is called, passing the modified `context` object, to proceed to the next middleware function.

```typescript
const diffHandler = async (context, next) => {
  const ignoreThese = {};
  // loop through the diffs
  Object.entries(context.diffs).forEach(([uid, diffs]) => {
    for (const [i, diff] of diffs) {
      // get the path of the diff in the schema
      const path = [uid].concat(diff.path).join('.');

      // Allow a diff on the country schema displayName
      if (path === 'api::country.country.info.displayName') {
        if (!isArray(context.ignoredDiffs[uid])) {
          context.ignoredDiffs[uid] = [];
        }
        context.ignoredDiffs[uid][i] = diff;
      }
    }
  });

  return next(context);
};

engine.onSchemaDiff(diffHandler);
```

After all the schemaDiffHandler middlewares have been run, another diff is run between `context.ignoredDiffs` and `context.diffs` and any remaining diffs that have not been ignored are thrown as fatal errors and the engine will abort the transfer.

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

The engine includes a diagnostics reporter which can be used to listen for diagnostics information (debug messages, errors, etc).

Here is an example for creating a diagnostics listener:

```typescript
// listener function
const diagnosticListener: DiagnosticListener = (data: GenericDiagnostic) => {
  // handle the diagnostics event, for example with custom logging
};

// add a generic listener
engine.diagnostics.onDiagnostic(diagnosticsListener);

// add an error listener
engine.diagnostics.on('error', diagnosticListener);

// add a warning listener
engine.diagnostics.on('warning', diagnosticListener);
```

To emit your own diagnostics event:

```typescript
const event: ErrorDiagnostic = {
  kind: 'error',
  details: {
    message: 'Your diagnostics message'
    createdAt: new Date(),
  },
  name: 'yourError',
  severity: 'fatal',
  error: new Error('your error message')
}

engine.diagnostics.report(event);
```

Here is an excerpt of the relevant types used in the previous examples:

```typescript
// engine/diagnostic.ts
// format of the data sent to the listener
export type GenericDiagnostic<K extends DiagnosticKind, T = unknown> = {
  kind: K;
  details: {
    message: string;
    createdAt: Date;
  } & T;
};

export type DiagnosticKind = 'error' | 'warning' | 'info';

export type Diagnostic = ErrorDiagnostic | WarningDiagnostic | InfoDiagnostic;

export type ErrorDiagnosticSeverity = 'fatal' | 'error' | 'silly';

export type ErrorDiagnostic = GenericDiagnostic<
  'error',
  {
    name: string;
    severity: ErrorDiagnosticSeverity;
    error: Error;
  }
>;

export type WarningDiagnostic = GenericDiagnostic<
  'warning',
  {
    origin?: string;
  }
>;

export type InfoDiagnostic<T = unknown> = GenericDiagnostic<
  'info',
  {
    params?: T;
  }
>;
```

### Transforms

Transforms allow you to manipulate the data that is sent from the source before it reaches the destination.

## Filter (excluding data)

Filters can be used to exclude data sent from the source before it is streamed to the destination. They are methods that accept an entity, link, schema, etc and return `true` to keep the entity and `false` to remove it.

Here is an example that filters out all entities with an id higher than 100:

```typescript
const options = {
  ...otherOptions,
  transforms: {
    entities: [
      {
        // exclude all ignored admin content types
        filter(entity) {
          return !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type);
        },
      },
      {
        // exclude all entities with an id higher than 100
        filter(entity) {
          return Number(entity.id) <= 100;
        },
      },
    ],
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
      {
        // remember to exclude links as well or else an error will be thrown when attempting to link an entity we filtered
        filter(entity) {
          return Number(link.left.id) <= 100 || Number(link.right.id) <= 100)
        },
      },
    ],
  },
};
```

## Map (modifying data)

Maps can be used to modify data sent from the source before it is streamed to the destination. They are methods that accept an entity, link, schema, etc and return the modified version of the object.

This can be used, for example, to sanitize data between environments.

Here is an example that removes a field called `somePrivateField` from a content type `privateThing`.

```typescript
const options = {
  ...otherOptions,
  transforms: {
    entities: [
      {
        // exclude all ignored content types
        filter(entity) {
          return !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type);
        },
      },
      {
        map(entity) {
          // remove somePrivateField from privateThing entities
          if (entity.type === 'api::privateThing.privateThing') {
            entity.somePrivateField = undefined;
          }

          return entity;
        },
      },
    ],
  },
};
```

By mapping schemas as well as entities, it's even possible (although complex!) to modify data structures between source and destination.

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
