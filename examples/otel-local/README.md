# Local OpenTelemetry stack for Strapi

Docker Compose runs an **OpenTelemetry Collector** plus **Jaeger** so Strapi can send OTLP from your machine.

**Strapi does not ship application log lines over OTLP** (no replacement for Winston / `strapiPerfLog`). OTLP carries **traces** and **metrics** only:

| Signal  | Config path                    | OTLP HTTP URL (typical)            |
| ------- | ------------------------------ | ---------------------------------- |
| Traces  | `server.observability.tracing` | `http://127.0.0.1:4318/v1/traces`  |
| Metrics | `server.observability.metrics` | `http://127.0.0.1:4318/v1/metrics` |

There is **no collector login or web UI** — the collector only receives and forwards telemetry.

| Where to look      | What you see                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Jaeger**         | **Traces** — HTTP spans; nested Knex `db.*`; Content API **sanitize / validate** (`strapi.content-api.sanitize.*`, `strapi.content-api.validate.*`); **admin permissions** sanitize/validate (`strapi.admin.permissions.sanitize.*`, `strapi.admin.permissions.validate.*`); Core REST **document service** (`strapi.documents.findMany`, etc.). Open [http://localhost:16686](http://localhost:16686) (no auth). Search by **service** name (e.g. `strapi-complex`). |
| **Collector logs** | **Metrics** — `debug` exporter prints batches (~60s). Includes HTTP summaries, DB slow/error counts, **`strapi.content_api.phase.duration_ms`**, **`strapi.document_service.operation.duration_ms`**, **`strapi.admin.permissions.phase.duration_ms`**. Add Prometheus/Grafana for dashboards.                                                                                                                                                                        |

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

## 2. Point Strapi at the collector

The **[complex example](../complex/README.md#opentelemetry)** is pre-wired via `config/server.ts` and env vars (`STRAPI_OTEL_*` in `.env.example`). Start Strapi after the stack above is running.

For **any other app**, set `server.observability.tracing` and `server.observability.metrics` with `otlp.enabled` and `url` pointing at `http://127.0.0.1:4318/v1/traces` and `…/v1/metrics` respectively. **Metrics** need the performance hub signals (DB perf + request timeline); **tracing** only needs tracing enabled.

---

## 3. View data

1. **Traces:** [http://localhost:16686](http://localhost:16686) → **Search** → pick your service → **Find traces**. Use routes that hit the API (e.g. Content Manager); a bare **`GET /admin`** document often has **no DB child spans** because the HTML shell may do little server-side SQL.
2. **Metrics:** `docker compose -f examples/otel-local/docker-compose.yml logs -f otel-collector` and wait for **ResourceMetrics** after traffic + export interval.

Strapi does **not** retain long-term history; Jaeger / your backend stores traces until its retention; metrics in this demo are only what you see in logs unless you add a real metrics backend.

---

## 4. Reading trace waterfalls (quick)

- **`db.select` / `db.first` / …** — Knex **builder method** for that round-trip, not “one giant query”. Expand a span for attributes like `db.statement` when present.
- **`strapi.content-api.sanitize.*` / `validate.*`** — time in Content API input/query sanitization and validation (REST controllers).
- **`strapi.admin.permissions.sanitize.*` / `validate.*`** — time in the admin **permissions manager** sanitize/validate helpers (RBAC-scoped admin API payloads and queries).
- **`strapi.documents.*`** — time inside **`strapi.documents(uid)`** Core REST operations (`findMany`, `create`, …), excluding separate sanitize/validate spans around them.
- **Gaps between `db.*` bars** — time **not** inside those traced queries (JS work, untraced I/O, scheduling), not DB time for those spans.
- **Several `db.*` bars overlapping** — overlapping wall-clock time (concurrent async work). **Same start tick but no overlap** can still be sequential.

---

## 5. Collector not running

Strapi **keeps running**. Export is **async** (batched); failed OTLP calls should **not** block requests. You may see **warnings** in Strapi logs. To disable OTLP entirely while developing, use **`STRAPI_OTEL_ENABLED=false`** in the complex example (see [complex README](../complex/README.md#opentelemetry)).

---

## 6. Files in this folder

- `docker-compose.yml` — collector + Jaeger
- `otel-collector-config.yaml` — OTLP in; traces → Jaeger + `debug` logs; metrics → `debug` logs

---

## Next steps (production)

Run the collector (or vendor agent) where your ops team expects it; set OTLP `url` (and `headers` if required). Add Prometheus remote write, Grafana, Tempo, etc., by extending the collector config.
