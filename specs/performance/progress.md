# Performance monitoring — progress tracker

High-level roadmap and delivery status for the core performance instrumentation work. Each step links to its detailed spec under this folder.

| Step        | Topic                                | Detail spec                                                                                        | Status          |
| ----------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------- |
| 01 — SQL    | Slow / error DB query signals        | [01-core-sql-slow-query-monitoring.md](./01-core-sql-slow-query-monitoring.md)                     | **Done**        |
| 02 — File   | Structured artifact output           | [02-core-performance-artifact-output.md](./02-core-performance-artifact-output.md)                 | **Partial**     |
| 03 — CI     | Perf job + thresholds                | [03-ci-workload-threshold-evaluation.md](./03-ci-workload-threshold-evaluation.md)                 | **Not started** |
| 04 — Plugin | Optional Performance Insights plugin | [04-optional-plugin-performance-insights.md](./04-optional-plugin-performance-insights.md)         | **Not started** |
| 05 — API    | Public event contract for plugins    | [05-public-performance-event-api-for-plugins.md](./05-public-performance-event-api-for-plugins.md) | **Done**        |
| 06 — Req    | Request timeline + DB correlation    | [06-core-request-timeline-events.md](./06-core-request-timeline-events.md)                         | **Partial**     |

---

## What is implemented today (quick reference)

- **Database (`@strapi/database`)**: Knex listeners, duration + fingerprint, sampling, fast-path error emission, optional SQL/bind capture, subscriber API and internal hooks (`getRequestId`, `notifyQueryTelemetry`).
- **Core bridge**: DB events forwarded to `strapi.eventHub` as `performance.db.query.slow` / `performance.db.query.error`, optional structured logger output.
- **Request correlation**: When `database.performance.enabled` or `server.performance.requestSummaryEnabled` is `true`, Koa assigns `strapiPerfRequestId`; core injects `getRequestId`; Strapi QueryBuilder attaches `mergeKnexQueryContext` so slow/error events carry **`requestId`** when HTTP (or caller) context exists.
- **Per-request rollup (summaries)** (partial vs spec **06**): When `requestSummaryEnabled` **or** `requestTrackingEnabled` is `true`, middleware aggregates counts/millis and emits a **versioned** `performance.request.summary` after the HTTP response completes (`route`, `statusCode`, `slowQueryCount`, plus backward-compatible `slowOrErrorQueryEvents`). Covered by unit tests on `runRequestPerformanceMiddleware`, route resolution, config alias, and `mergeQueryTelemetryIntoStats`.
- **Artifact sink (thin)**: When `database.performance.output` is `artifact` or `both` and `artifactPath` is set, a provider buffers hub DB events and appends JSON lines (`schemaVersion`, `flushedAt`, `events`).

---

## Gap list (still to align with specs)

Updates below map to the same numbered specs linked in the table.

### [01](./01-core-sql-slow-query-monitoring.md)

- **Acceptance criterion 3 (correlation)** is covered: ALS-backed ids when DB perf **or** request summaries are enabled, plus **Knex `queryContext.requestId`** on QueryBuilder-built queries (`mergeKnexQueryContext` — including deep-sort join queries and joined delete/update paths).
- **Spec touchpoint** `connection.ts`: listeners remain registered alongside the Knex instance in `[Database](../../packages/core/database/src/index.ts)`; no dedicated split in `[connection](../../packages/core/database/src/connection.ts)` is required for v1.
- **Bench / regressions**: spec §Performance still needs a maintained benchmark run (manual or CI) — not automated here.
- **Defaults contract**: unit test documents `DEFAULT_DATABASE_PERFORMANCE_CONFIG` matches spec defaults (`captureSqlText` / `captureBindings` off).

### [02](./02-core-performance-artifact-output.md)

- Full **v1 schema** still missing (`strapiVersion`, `nodeVersion`, optional `gitSha`, redacted `config` snapshot, aggregate **`summary`** with percentiles / top fingerprints).
- Config key naming may need alignment (`flushIntervalMs` / `maxEvents` vs current `artifactFlushIntervalMs` / `artifactMaxEvents`).
- Decide single-file vs append-only contract and document it in the spec.

### [03](./03-ci-workload-threshold-evaluation.md)

- No GitHub Actions workflow, workload harness, or threshold comparison yet.

### [04](./04-optional-plugin-performance-insights.md)

- No dedicated plugin package; no OTLP/vendor exporters or aggregation UI.

### [05](./05-public-performance-event-api-for-plugins.md)

- **Delivered**: Hub payloads include **`schemaVersion`** + **`eventVersion`**; contributor doc [performance-events.md](../../docs/docs/docs/01-core/strapi/performance-events.md); **`strapi.performanceEvents`** (`subscribe`, `getSchemaVersion`, `getCapabilities`) wraps listeners with error isolation; **`eventHub.emit`** isolates subscriber/listener throws when configured (Strapi wiring logs warnings).

### [06](./06-core-request-timeline-events.md)

- No `performance.request.start` or `performance.request.stage` yet; no `emitStageEvents` / stage timing in the pipeline.
- Summary payload **aligned further**: **`route`** (template when matched), **`statusCode`**, **`slowQueryCount`** (+ deprecated **`slowOrErrorQueryEvents`** alias). Remaining gaps: **`slowRequestMs`** / **`requestSampleRate`** sampling, stage events.
- Config: **`requestTrackingEnabled`** accepted as alias for **`requestSummaryEnabled`** (either enables the same middleware).
