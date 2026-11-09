# Local OpenTelemetry stack for Strapi

Docker Compose runs an **OpenTelemetry Collector** plus **Jaeger** so a Strapi app can send OTLP from your machine.

**Strapi uses only `@opentelemetry/api`.** It never registers a tracer provider, meter provider, propagator, or exporter. The app owns the OpenTelemetry SDK and must load it before Strapi starts (for example with `NODE_OPTIONS="--require ./otel.js"`). Without an SDK, every Strapi span and metric is a no-op.

Strapi config only decides which instrumentation runs:

| Signal  | Config path                            | What Strapi records                                         |
| ------- | -------------------------------------- | ----------------------------------------------------------- |
| Traces  | `server.observability.tracing.enabled` | HTTP, route stage, Knex, bcryptjs, startup, and phase spans |
| Metrics | `server.observability.metrics.enabled` | Request, slow/error query, and phase histograms/counters    |

**Strapi does not ship application log lines over OTLP** (no replacement for Winston / `strapiPerfLog`).

There is **no collector login or web UI** — the collector only receives and forwards telemetry.

| Where to look      | What you see                                                                                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Jaeger**         | **Traces** — **App (worker):** `strapi.startup`, `strapi.startup.cli.*` (post-`load()` develop work), **HTTP** `METHOD path`, **`strapi.http.route.*`**, **Knex** `db.*`, **`bcryptjs.*`**, Content API, document service. Open [http://localhost:16686](http://localhost:16686).              |
| **Collector logs** | **Metrics** — `debug` exporter prints batches (~60s). Includes HTTP summaries, DB slow/error counts, **`strapi.content_api.phase.duration_ms`**, **`strapi.document_service.operation.duration_ms`**, **`strapi.admin.permissions.phase.duration_ms`**. Add Prometheus/Grafana for dashboards. |

---

## 1. Start Jaeger + collector

From the monorepo root:

```bash
cd examples/otel-local
docker compose up
```

Ports: **16686** (Jaeger UI), **4318** / **4317** (OTLP HTTP / gRPC into the collector).

Stop: `Ctrl+C` or `cd examples/otel-local && docker compose down`.

---

## 2. Load an SDK in the Strapi app

Install the SDK in the **app** (not in Strapi packages), for example `@opentelemetry/sdk-node`, and add an `otel.js` next to `package.json`:

```js
// otel.js — loaded before Strapi via NODE_OPTIONS
const { NodeSDK } = require('@opentelemetry/sdk-node');

new NodeSDK().start();
```

`NodeSDK` registers the async-hooks context manager (needed for nested spans), the W3C propagator, and OTLP exporters configured from `OTEL_*` env vars. Then start Strapi with the SDK preloaded:

```bash
OTEL_SERVICE_NAME=strapi-complex \
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318 \
OTEL_TRACES_EXPORTER=otlp \
OTEL_METRICS_EXPORTER=otlp \
NODE_OPTIONS="--require ./otel.js" \
yarn develop
```

The SDK must be registered before Strapi loads: the metrics API binds instruments to the provider that exists when Strapi starts.

The **[complex example](../complex/README.md#opentelemetry)** turns on the Strapi side with `STRAPI_OTEL_ENABLED=true`. For **any other app**, set `server.observability.tracing.enabled` and/or `server.observability.metrics.enabled`. **Metrics** also need the performance hub signals (DB perf + request tracking).

---

## 3. View data

1. **Traces:** [http://localhost:16686](http://localhost:16686) → **Search** → pick your service → **Find traces**. After a restart, look for **`strapi.startup`** for boot waterfalls. For the **complex** example, **`yarn stress:rest`** (from `examples/complex`) sends **POST** / **PUT** / **GET** by default so you see mutations in Jaeger; **`yarn stress:rest:reads`** is GET-only. A bare **`GET /admin`** document often has **no DB child spans** because the HTML shell may do little server-side SQL.
2. **Metrics:** `docker compose -f examples/otel-local/docker-compose.yml logs -f otel-collector` and wait for **ResourceMetrics** after traffic + export interval.

Strapi does **not** retain long-term history; Jaeger / your backend stores traces until its retention; metrics in this demo are only what you see in logs unless you add a real metrics backend.

---

## 4. Reading trace waterfalls (quick)

- **`strapi.startup`** — **Root** trace for server boot. With `strapi develop`, `load()` runs register + bootstrap under this root; the root stays open until `start()` ends it. **`strapi.startup.cli.*`** spans cover work the **develop worker** does between `load()` and `listen()` (admin watch build, TypeScript generators, `tsc`, chokidar). Initial TypeScript compile and production admin build on the **cluster primary** (before the worker runs) are **not** included in this trace. A long gap before `strapi.startup.listen` often reflects that primary-side work or other untraced time; check **`strapi.startup.cli.generate_types`** and **`strapi.startup.cli.compile_typescript`** for worker-side gaps after `load()`.
- **`strapi.startup.register`**, **`strapi.startup.bootstrap`**, **`strapi.startup.listen`** — Major phases; bootstrap expands into **`strapi.startup.bootstrap.db.schema_sync`**, **`strapi.startup.bootstrap.build_models`**, etc.
- **`strapi.http.route.auth` / `.policy` / `.middleware` / `.controller`** — Koa pipeline stages for **every** registered route when tracing is on (disable with `server.observability.tracing.recordRouteHandlerStages: false`). Shows time outside Knex (e.g. Passport, policies) between DB spans.
- **`bcryptjs.compare` / `bcryptjs.hash`** — Password hashing / verification (admin and anywhere else using `bcryptjs`) as child spans of the active context.
- **`strapi.content-api.sanitize.*` / `validate.*`** — time in Content API input/query sanitization and validation (REST controllers).
- **`strapi.admin.permissions.sanitize.*` / `validate.*`** — time in the admin **permissions manager** sanitize/validate helpers (RBAC-scoped admin API payloads and queries).
- **`strapi.documents.*`** — time inside **`strapi.documents(uid).{operation}`** for any caller (REST Core API, Content Manager, etc.); not tied to the REST controller layer alone.
- **Gaps between `db.*` bars** — time **not** inside those traced queries (JS work, untraced I/O, scheduling), not DB time for those spans.
- **Several `db.*` bars overlapping** — overlapping wall-clock time (concurrent async work). **Same start tick but no overlap** can still be sequential.

---

## 5. Collector not running

Strapi **keeps running**. Export happens in the app's SDK, so retry and failure behavior depend on how you configured it. To stop sending data, start Strapi without the `--require` preload or set `STRAPI_OTEL_ENABLED=false` in the complex example.

---

## 6. Files in this folder

- `docker-compose.yml` — collector + Jaeger
- `otel-collector-config.yaml` — OTLP in; traces → Jaeger + `debug` logs; metrics → `debug` logs

---

## Next steps (production)

Configure the SDK in your app the way your ops team expects (exporter endpoint, headers, sampler, resource attributes). Add Prometheus remote write, Grafana, Tempo, etc., by extending the collector config.
