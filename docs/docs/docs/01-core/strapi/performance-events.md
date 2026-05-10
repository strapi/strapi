---
title: Performance hub events
description: Versioned performance signals on strapi.eventHub for plugins and operators
tags:
  - core
  - plugins
  - observability
---

# Performance hub events

Strapi emits **namespaced** performance events on `strapi.eventHub`. They complement internal metrics and stay **additive** within a major Strapi version.

## Stability

- Every payload includes **`schemaVersion`** (namespace version, currently **1**).
- Each event shape includes **`eventVersion`** so fields can evolve independently.
- Breaking changes only happen in a new major; within v5, expect additive fields only.

## Subscribing (recommended)

Use `strapi.performanceEvents` so handler failures are isolated and do not reject `emit`:

```ts
export default {
  bootstrap({ strapi }) {
    const off = strapi.performanceEvents.subscribe(
      'performance.request.summary',
      async (summary) => {
        // summary is the versioned payload (see below)
      }
    );

    strapi.db.lifecycles.subscribe({
      async destroy() {
        off();
      },
    });
  },
};
```

Capabilities and schema version:

```ts
strapi.performanceEvents.getSchemaVersion(); // 1
strapi.performanceEvents.getCapabilities(); // { schemaVersion: 1, events: [...] }
```

You may still use `strapi.eventHub.subscribe` / `on`, but core isolates errors only for listeners registered through **`performanceEvents.subscribe`** and for internal routing via the hub’s global error handler.

## Event catalog

### `performance.db.query.slow` / `performance.db.query.error`

Emitted when `database.performance.enabled` is true and the database layer records a slow or failed query.

Payload (**v1**): `schemaVersion`, `eventVersion`, plus

| Field              | Required | Notes                                                   |
| ------------------ | -------- | ------------------------------------------------------- |
| `type`             | yes      | `query.slow` or `query.error`                           |
| `timestamp`        | yes      | ISO string                                              |
| `durationMs`       | yes      |                                                         |
| `dbClient`         | yes      | e.g. `postgres`, `mysql`, `sqlite`                      |
| `queryFingerprint` | yes      | Normalized fingerprint                                  |
| `queryType`        | yes      | `select` \| `insert` \| `update` \| `delete` \| `other` |
| `requestId`        | no       | Present when HTTP / ALS correlation exists              |
| `success`          | yes      |                                                         |
| `errorCode`        | no       | Set for errors                                          |
| `sql`              | no       | Only if `captureSqlText`                                |
| `bindings`         | no       | Only if `captureBindings`                               |

Producer: `@strapi/database`. Bridge: `@strapi/core` forwards to the hub with versioning.

### `performance.request.summary`

Emitted when **`server.performance.requestSummaryEnabled`** or **`server.performance.requestTrackingEnabled`** is true, after the HTTP response finishes.

Payload (**v1**): `schemaVersion`, `eventVersion`, plus

| Field                    | Required | Notes                                            |
| ------------------------ | -------- | ------------------------------------------------ |
| `requestId`              | yes      | Correlates with DB events when context exists    |
| `durationMs`             | yes      | Wall time for the HTTP request                   |
| `method`                 | yes      |                                                  |
| `route`                  | yes      | Matched route pattern when available, else path  |
| `path`                   | yes      | Raw path (may be higher cardinality)             |
| `statusCode`             | yes      | HTTP status at end of request                    |
| `dbQueryCount`           | yes      | Queries attributed to this request               |
| `dbTotalMs`              | yes      | Sum of DB time from telemetry hook               |
| `slowQueryCount`         | yes      | Slow or failed query **events** for this request |
| `slowOrErrorQueryEvents` | yes      | Deprecated alias of `slowQueryCount`             |

## Rate limiting

Slow-query and request summaries can be high volume if thresholds are low. Use **`database.performance.sampleRate`**, **`slowQueryMs`**, and production-safe capture flags. Plugin handlers should be **non-blocking** and **cheap**; never `await` remote exporters on the hot path inside the listener—queue work instead.

## See also

- [Event Hub](./event-hub.md)
