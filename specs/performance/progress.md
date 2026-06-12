# Performance monitoring — progress tracker

High-level roadmap and delivery status for the core performance instrumentation work. Each step links to its detailed spec under this folder.

_Status verified against the repository (packages, docs, `.github`), not from informal notes._

| Step        | Topic                                | Detail spec                                                                                        | Status          |
| ----------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------- |
| 01 — SQL    | Slow / error DB query signals        | [01-core-sql-slow-query-monitoring.md](./01-core-sql-slow-query-monitoring.md)                     | **Done**        |
| 02 — File   | Structured artifact output           | [02-core-performance-artifact-output.md](./02-core-performance-artifact-output.md)                 | **Partial**     |
| 03 — CI     | Perf job + thresholds                | [03-ci-workload-threshold-evaluation.md](./03-ci-workload-threshold-evaluation.md)                 | **Not started** |
| 04 — Plugin | Optional Performance Insights plugin | [04-optional-plugin-performance-insights.md](./04-optional-plugin-performance-insights.md)         | **Not started** |
| 05 — API    | Public event contract for plugins    | [05-public-performance-event-api-for-plugins.md](./05-public-performance-event-api-for-plugins.md) | **Done**        |
| 06 — Req    | Request timeline + DB correlation    | [06-core-request-timeline-events.md](./06-core-request-timeline-events.md)                         | **Partial**     |

**Outside this table (implemented in core):** optional **OpenTelemetry tracing** via `server.observability.tracing` (`@strapi/core`: HTTP server spans + Knex query spans, console and/or OTLP HTTP exporter). This is **not** the spec **04** plugin/UI; it is framework-level tracing.

---

## What is implemented today (quick reference)

- **Database (`@strapi/database`)**: `Database` registers Knex `query` / `query-response` / `query-error` handlers in [`packages/core/database/src/index.ts`](../../packages/core/database/src/index.ts) (`registerPerformanceListeners`). Duration, fingerprint, sampling, optional SQL/bind capture, `subscribeToPerformanceEvents`, and runtime hooks `getRequestId` / `notifyQueryTelemetry` (injected by core when configured).
- **Core bridge**: [`bridgeDatabasePerformanceEvents`](../../packages/core/core/src/services/performance/events.ts) forwards DB subscriber events to `strapi.eventHub` as `performance.db.query.slow` / `performance.db.query.error` with **versioned** payloads; optional **single-line JSON** log when `database.performance.output` is `log` or `both` (`query.error` → `warn`, `query.slow` → `debug`).
- **Request correlation**: `strapiPerfRequestId` is set in [`runRequestPerformanceMiddleware`](../../packages/core/core/src/services/server/request-performance-middleware.ts) when **`database.performance.enabled`** **or** **`server.performance.requestTrackingEnabled`** is true (see [`isServerRequestPerfTrackingEnabled`](../../packages/core/core/src/utils/server-performance-tracking.ts)). Core passes **`getRequestId`** into the DB config when either DB perf or request tracking is on; QueryBuilder uses **`mergeKnexQueryContext`** so slow/error events can carry **`requestId`** when ALS/request context exists.
- **Per-request rollup (summaries)** (partial vs spec **06**): Same flags as above for **emitting** summaries: when **`requestTrackingEnabled`** is true, **`performance.request.summary`** is emitted after `finish`/`close` with **`route`** (template when available), **`statusCode`**, **`slowQueryCount`**, plus **`schemaVersion`** / **`eventVersion`**. Implemented in [`request-performance-middleware.ts`](../../packages/core/core/src/services/server/request-performance-middleware.ts); wired from [`services/server/index.ts`](../../packages/core/core/src/services/server/index.ts) inside `requestCtx` + optional HTTP tracing wrapper.
- **Telemetry aggregation**: [`mergeQueryTelemetryIntoStats`](../../packages/core/core/src/utils/perf-query-stats.ts) updates **`perfQueryStats`** from **`notifyQueryTelemetry`** in [`Strapi.ts`](../../packages/core/core/src/Strapi.ts) when request tracking is enabled.
- **Artifact sink (thin)**: [`attachPerformanceArtifactWriter`](../../packages/core/core/src/services/performance/artifact.ts) (provider [`performance-monitor`](../../packages/core/core/src/providers/performance-monitor.ts)) listens on the hub for the DB perf + request timeline event names, buffers, and writes **append-only** NDJSON lines. Each line is an envelope with `schemaVersion`, `generatedAt`, `strapiVersion`, `nodeVersion`, optional `gitSha`, a redacted `config` snapshot, an aggregate `summary` (p50/p95/p99, top fingerprints, request counts), and `events`. Config: **`database.performance.artifactPath`**, **`flushIntervalMs`**, **`maxEvents`**, **`artifactMaxFileBytes`** (defaults 5000 ms / 10000 events / no rotation in code).
- **Public perf API & hub safety**: **`strapi.performanceEvents`** in [`events-public-api.ts`](../../packages/core/core/src/services/performance/events-public-api.ts); contributor doc [`performance-events.md`](../../docs/docs/docs/01-core/strapi/performance-events.md); [`createEventHub`](../../packages/core/core/src/services/event-hub.ts) isolates subscriber/listener errors so one failing handler never rejects `emit` for the others.
- **OpenTelemetry (core)**: Provider [`observability-tracing`](../../packages/core/core/src/providers/observability-tracing.ts), implementation [`opentelemetry-tracing.ts`](../../packages/core/core/src/services/observability/opentelemetry-tracing.ts); gated by **`server.observability.tracing.enabled`**.

---

## Automated tests (inventory)

| Area                           | Location                                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB perf behaviour & defaults   | [`packages/core/database/src/__tests__/performance.test.ts`](../../packages/core/database/src/__tests__/performance.test.ts), [`performance-defaults.test.ts`](../../packages/core/database/src/__tests__/performance-defaults.test.ts)                                                                                                 |
| Hub bridge & payloads          | [`events.test.ts`](../../packages/core/core/src/services/performance/__tests__/events.test.ts), [`event-payloads.test.ts`](../../packages/core/core/src/services/performance/__tests__/event-payloads.test.ts)                                                                                                                          |
| `performanceEvents` API        | [`events-public-api.test.ts`](../../packages/core/core/src/services/performance/__tests__/events-public-api.test.ts)                                                                                                                                                                                                                    |
| Event hub isolation            | [`event-hub.test.ts`](../../packages/core/core/src/services/__tests__/event-hub.test.ts)                                                                                                                                                                                                                                                |
| Artifact writer                | [`artifact.test.ts`](../../packages/core/core/src/services/performance/__tests__/artifact.test.ts)                                                                                                                                                                                                                                      |
| Request summary middleware     | [`request-performance-middleware.test.ts`](../../packages/core/core/src/services/server/__tests__/request-performance-middleware.test.ts)                                                                                                                                                                                               |
| Route template / flags / stats | [`koa-route-template.test.ts`](../../packages/core/core/src/utils/__tests__/koa-route-template.test.ts), [`server-performance-tracking.test.ts`](../../packages/core/core/src/utils/__tests__/server-performance-tracking.test.ts), [`perf-query-stats.test.ts`](../../packages/core/core/src/utils/__tests__/perf-query-stats.test.ts) |
| OTel helpers only              | [`opentelemetry-tracing-utils.test.ts`](../../packages/core/core/src/services/observability/__tests__/opentelemetry-tracing-utils.test.ts)                                                                                                                                                                                              |

**Not covered by automated tests:** representative **benchmark / regression** for SQL overhead (spec **01**); **full OTel** provider stack (integration-style); **`tests/api`** or E2E exercising perf config end-to-end.

---

## Gap list (still to align with specs)

### [01](./01-core-sql-slow-query-monitoring.md)

- Correlation and emission behaviour: **done** in code and covered by DB + core unit tests.
- Listeners live on **`Database`** after Knex creation ([`index.ts`](../../packages/core/database/src/index.ts)), not split into [`connection.ts`](../../packages/core/database/src/connection.ts) alone — acceptable for v1.
- **Bench / regressions**: still **no** maintained automated benchmark in CI or repo scripts.

### [02](./02-core-performance-artifact-output.md)

- File envelope is now **rich**: **`schemaVersion`**, **`generatedAt`**, **`strapiVersion`**, **`nodeVersion`**, optional **`gitSha`**, redacted **`config`** snapshot, aggregate **`summary`** (p50/p95/p99 + top fingerprints + request counts), and **`events`**.
- Config keys are **`flushIntervalMs`** / **`maxEvents`**. Optional **`artifactMaxFileBytes`** enables size-based rotation.
- Append-only behaviour is **implemented**; full contract should still be spelled out in the detail spec.

### [03](./03-ci-workload-threshold-evaluation.md)

- **No** workflow under `.github` referencing perf thresholds or this artifact format (verified by search).

### [04](./04-optional-plugin-performance-insights.md)

- **No** dedicated “Performance Insights” plugin package, aggregation UI, or plugin-scoped exporters.
- **Note:** **`server.observability.tracing`** in core can export traces via OTLP HTTP — this satisfies **tracing** needs for some deployments but **not** the spec’s plugin/product shape.

### [05](./05-public-performance-event-api-for-plugins.md)

- **Done** for documented hub contract, versioned payloads, **`strapi.performanceEvents`**, hub error isolation, and contributor docs (see quick reference above).

### [06](./06-core-request-timeline-events.md)

- **Missing:** `performance.request.start`, `performance.request.stage`, **`emitStageEvents`**, pipeline stage timings.
- **Missing:** **`slowRequestMs`**, **`requestSampleRate`** (and related sampling of summaries).
- **Present:** end-of-request **summary** with DB rollups and correlation; **`requestTrackingEnabled`** alias.
