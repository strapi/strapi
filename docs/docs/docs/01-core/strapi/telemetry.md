---
title: Server-side telemetry
description: How server-side analytics works in the monorepo — strapi.telemetry.send, event naming, rate limiting, and package metrics services.
tags:
  - core
  - telemetry
  - analytics
---

# Server-side telemetry

Strapi collects anonymous usage data to understand feature adoption and improve the product. This document describes how **server-side** telemetry works in the monorepo — where events are sent, how they are named, and the patterns used to avoid flooding the analytics backend.

For the public-facing overview of what is collected, see [Usage information](https://docs.strapi.io/developer-docs/latest/getting-started/usage-information.html).

Admin panel (browser) events are a separate channel — see [Admin telemetry (frontend)](/docs/core/admin/features/telemetry). MCP and other server-only features should use the **server-side** patterns below.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Feature code (controller, service, bootstrap, CLI, cron)       │
│       strapi.telemetry.send('didSomething', { ...payload })     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  packages/core/core/src/services/metrics/                       │
│    index.ts        → createTelemetryInstance, LIMITED_EVENTS    │
│    sender.ts       → POST body assembly + strapi.fetch()        │
│    rate-limiter.ts → once-per-24h dedup for selected events    │
│    middleware.ts   → didReceiveRequest (REST, capped at 1000/d) │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              https://analytics.strapi.io/api/v2/track
              (override: STRAPI_ANALYTICS_URL)
```

### Registration

Telemetry is wired through the `telemetry` provider:

- `packages/core/core/src/providers/telemetry.ts` — registers `strapi.telemetry` on the Strapi container.
- `packages/core/core/src/services/metrics/index.ts` — factory that exposes `send()`, `register()`, `isDisabled`.

On `register()` (when telemetry is enabled):

1. A daily cron job sends a `ping` event (`0 0 12 * * *`).
2. REST request middleware is mounted to emit `didReceiveRequest` (see [Volume controls](#volume-controls)).

### Sending an event

```typescript
strapi.telemetry.send('didCreateContentType', {
  eventProperties: { kind: 'collectionType' },
  userProperties: {
    /* optional, per-user */
  },
  groupProperties: {
    /* optional, project-level */
  },
});
```

Implementation: `packages/core/core/src/services/metrics/sender.ts`.

Each request is a single HTTP `POST` with JSON body:

| Field             | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `event`           | Event name (also sent as `X-Strapi-Event` header)              |
| `userId`          | Hashed admin user when available (`generateAdminUserHash`)     |
| `installId`       | Stable install identifier from project uuid + package.json     |
| `eventProperties` | Context specific to this occurrence                            |
| `userProperties`  | User/environment traits (OS, Node version, etc.)               |
| `groupProperties` | Project traits (Strapi version, DB client, EE plan, counts, …) |

Default metadata is merged automatically (Docker/CI, TypeScript usage, `projectId`, `projectType`, EE subscription fields when present).

Errors are swallowed — telemetry must never break application behaviour. Call sites often append `.catch(() => {})` or fire-and-forget without awaiting.

### When telemetry is disabled

Telemetry is **off** when any of the following is true (`packages/core/core/src/services/metrics/index.ts`):

- No project `uuid` in config (typical for fresh clones before first run).
- `STRAPI_TELEMETRY_DISABLED` env is truthy (`1`, `true`, etc.).
- `package.json` → `strapi.telemetryDisabled: true`.

`strapi.telemetry.isDisabled` reflects this. Admin routes that expose telemetry data use the `admin::isTelemetryEnabled` policy.

---

## Event naming conventions

Server-side events follow a consistent vocabulary:

| Pattern                        | Meaning                                              | Examples                                             |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| `did*`                         | Completed action                                     | `didCreateContentType`, `didInviteUser`              |
| `didNot*`                      | Failed or aborted action                             | `didNotCreateContentType`, `didNotOpenTab`           |
| `didCreateFirst*`              | First occurrence in project lifetime                 | `didCreateFirstAdmin`, `didCreateFirstContentType`   |
| `didInitialize*`               | Plugin/feature bootstrap snapshot                    | `didInitializeI18n`, `didInitializePluginUpload`     |
| `did*ProcessStart/Finish/Fail` | Long-running process lifecycle                       | `didDEITSProcessStart` (data export/import/transfer) |
| `didSend*OnceAWeek`            | Weekly aggregated snapshot                           | `didSendUploadPropertiesOnceAWeek`                   |
| `ping`                         | Heartbeat                                            | Daily cron                                           |
| `will*`                        | Intent (mostly **admin frontend**, rare server-side) | —                                                    |

Casing is camelCase with no separators. Event names are flat strings — there is no namespacing prefix (e.g. no `mcp.didCallTool`).

---

## Payload conventions

### `eventProperties`

Action-specific, per-event context. Examples in the codebase:

- `kind` — content type kind on create
- `model` — content type UID on first entry create
- `url`, `success`, `statusCode` — REST middleware
- `source`, `destination` — data transfer providers
- `error` — failure messages

Prefer **categories and counts** over identifiers when volume is a concern. Some existing events do include UIDs (`model`, `workflowId`); new features should avoid repeating user-specific or content-specific names when a category suffices.

### `userProperties`

Traits of the acting user or anonymous environment:

- Auto-attached on server: `environment`, `os`, `nodeVersion`, …
- Explicit: `languagesInUse` (`didChangeInterfaceLanguage`)

Some events are explicitly anonymous (empty `userId`), e.g. `didStartServer`, `didChangeInterfaceLanguage`.

### `groupProperties`

Project/install-level state, often counts or configuration:

- `numberOfAllContentTypes`, `numberOfComponents`, `database`, `plugins` — startup
- `numberOfLocales` — i18n
- `uploadProvider`, `privateProvider` — upload init
- `numberOfActiveAdminUsers` — admin cron
- Aggregated weekly metrics objects — upload / review workflows

---

## Where server events are emitted

### Core / startup

| Event                          | Location                                                      | Notes                                                |
| ------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------- |
| `didStartServer`               | `packages/core/core/src/Strapi.ts` → `sendStartupTelemetry()` | Fired once per process start; rich `groupProperties` |
| `didOpenTab` / `didNotOpenTab` | `Strapi.ts` → `openAdmin()`                                   | Dev auto-open browser only                           |
| `ping`                         | metrics `register()` cron                                     | Daily noon                                           |
| `didReceiveRequest`            | `packages/core/core/src/services/metrics/middleware.ts`       | REST API only; not MCP/GraphQL/admin                 |

### Admin (`packages/core/admin/server`)

| Event                         | Trigger                         |
| ----------------------------- | ------------------------------- |
| `didCreateFirstAdmin`         | First admin registration        |
| `didInviteUser`               | User invitation                 |
| `didUpdateRolePermissions`    | Role permissions save           |
| `didChangeInterfaceLanguage`  | Language preference change      |
| `didUpdateProjectInformation` | Bootstrap + daily midnight cron |
| `didUpdateSSOSettings`        | EE SSO settings (EE)            |
| `didWatchAnAuditLog`          | EE audit log view (EE)          |

Metrics service: `packages/core/admin/server/src/services/metrics.ts`.

### Content-type builder

| Event                                                | Trigger                                                |
| ---------------------------------------------------- | ------------------------------------------------------ |
| `didCreateFirstContentType` / `didCreateContentType` | Content type create (`_.isEmpty(strapi.apis)` → first) |
| `didNotCreateContentType`                            | Create failure                                         |
| `didCreateFirstComponent` / `didCreateComponent`     | Component create (registry size check)                 |

### Content manager

| Event                            | Trigger                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `didCreateFirstContentTypeEntry` | First document in a collection type (`totalEntries === 0`) |
| `didConfigureListView`           | List view configuration save                               |

Metrics service: `packages/core/content-manager/server/src/services/metrics.ts`.

### Content releases

`didCreateContentRelease`, `didUpdateContentRelease`, `didDeleteContentRelease`, `didPublishContentRelease` — `packages/core/content-releases/server/src/services/release.ts`.

### Review workflows (EE)

Per-action: `didCreateStage`, `didEditStage`, `didDeleteStage`, `didChangeEntryStage`, `didCreateWorkflow`, `didEditWorkflow`, `didEditAssignee`.

Weekly aggregate: `didSendReviewWorkflowPropertiesOnceAWeek` via cron in `packages/core/review-workflows/server/src/services/metrics/weekly-metrics.ts`.

### Upload

| Event                                                                   | Trigger                               |
| ----------------------------------------------------------------------- | ------------------------------------- |
| `didInitializePluginUpload`                                             | Plugin bootstrap (rate-limited daily) |
| `didSaveMediaWithCaption` / `didSaveMediaWithAlternativeText`           | Media save (rate-limited daily)       |
| `didEnableResponsiveDimensions` / `didDisableResponsiveDimensions`      | Settings (rate-limited daily)         |
| `didUploadImage`                                                        | Image upload                          |
| `didBulkDeleteMediaLibraryElements` / `didBulkMoveMediaLibraryElements` | Bulk operations                       |
| `didSendUploadPropertiesOnceAWeek`                                      | Weekly cron aggregate                 |

Metrics wrapper: `packages/core/upload/server/src/services/metrics.ts` → `trackUsage()`.

### i18n

| Event                  | Trigger          |
| ---------------------- | ---------------- |
| `didInitializeI18n`    | Plugin bootstrap |
| `didUpdateI18nLocales` | Locale CRUD      |

### CLI (in-process Strapi or standalone)

| Event                              | Context                                      |
| ---------------------------------- | -------------------------------------------- |
| `didDEITSProcessStart/Finish/Fail` | Export, import, transfer                     |
| `didOptOutTelemetry`               | `strapi telemetry:disable`                   |
| `will/did*` project creation       | `packages/cli/create-strapi-app`             |
| Cloud CLI events                   | Proxied via Cloud API (`packages/cli/cloud`) |

---

### MCP (core)

| Event                          | Trigger                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `didStartMcpServer`            | MCP server started with `server.mcp.enabled: true` (`eventProperties.path`; `groupProperties.numberOfTools` / `numberOfPrompts` / `numberOfResources`; rate-limited daily) |
| `didUseMcpServer`              | Authenticated MCP HTTP request (`handlePost.ts`; rate-limited daily)                                                                                                       |
| `didNotAuthenticateMcpRequest` | MCP request rejected before handling (`eventProperties.errorClass`: `missing_token` \| `invalid_token`; rate-limited daily)                                                |
| `didNotHandleMcpRequest`       | Authenticated MCP request failed during connect/handle (`eventProperties.errorClass`: `timeout` \| `error`; rate-limited daily)                                            |
| `didExecuteMcpCapability`      | Successful capability execution (`eventProperties.type`: `tool` \| `prompt` \| `resource`; `action`; `source`)                                                             |
| `didNotExecuteMcpCapability`   | Capability returned `isError: true` (same shape + `errorClass`: `execution_error`)                                                                                         |

Implementation: `packages/core/core/src/services/mcp/metrics/`. Capability names are normalized to coarse `action` values — never content-type slugs. Request-level events use the core rate limiter; capability execute/not-execute events deduplicate **per type + action + source** in `metrics.ts`. Compare `didStartMcpServer` vs `didUseMcpServer` to see installs with MCP enabled but unused. Prompt/resource execution telemetry activates when normalization rules exist.

---

## Package-level metrics services

Several packages wrap `strapi.telemetry.send` in a dedicated `metrics` service rather than calling telemetry directly from controllers:

```
packages/core/admin/server/src/services/metrics.ts
packages/core/content-manager/server/src/services/metrics.ts
packages/core/upload/server/src/services/metrics.ts
packages/core/core/src/services/mcp/metrics/metrics.ts
packages/plugins/i18n/server/src/services/metrics.ts
packages/core/review-workflows/server/src/services/metrics/index.ts
packages/core/admin/ee/server/src/services/metrics.ts
```

Pattern: thin service with `sendDid…()` helpers; controllers/services call the metrics service. Tests mock `strapi.telemetry.send` or the metrics service.

---

## Volume controls

There is **no batching API** — each event is one HTTP request. Strapi uses several complementary strategies to limit volume:

### 1. Daily rate limiter (per event name)

`packages/core/core/src/services/metrics/rate-limiter.ts` wraps the sender for events listed in `LIMITED_EVENTS`.

For listed events: **at most one send per event name per 24 hours** (in-memory cache, resets on rolling 24h window).

Important: deduplication is by **event name only**, not by `eventProperties`. If one event name covers multiple categories (e.g. `didExecuteMcpCapability` with different `type` / `action` values), apply per-category dedup **before** calling `strapi.telemetry.send` (see MCP `metrics.ts`) rather than adding many names to `LIMITED_EVENTS`.

To rate-limit a new high-frequency event, either:

- Add its exact event name to `LIMITED_EVENTS`, or
- Use separate event names per category (each added to `LIMITED_EVENTS`), or
- Dedupe locally by category before send (MCP tool actions), or
- Use weekly aggregation (below).

### 2. REST middleware cap

`didReceiveRequest` is capped at **1000 events per 24 hours** per process (`middleware.ts`). Counter resets on rolling 24h window. Only matches URLs under the REST API prefix; static assets and non-GET/PUT/POST/DELETE methods are skipped.

MCP requests (`/mcp`) do **not** pass through this middleware.

### 3. Weekly aggregated cron jobs

For noisy domains, compute metrics locally and send **one event per week**:

- Upload: `didSendUploadPropertiesOnceAWeek` — folder depth stats, asset counts (`weekly-metrics.ts` + `strapi.store` for schedule jitter).
- Review workflows: `didSendReviewWorkflowPropertiesOnceAWeek` — workflow/stage counts.

Schedule is randomized per install (stored in `strapi.store`) to spread load.

### 4. First vs subsequent

“First use” pattern without persistent store:

- `didCreateFirstContentType` when `_.isEmpty(strapi.apis)` before create.
- `didCreateFirstComponent` when component registry is empty.
- `didCreateFirstAdmin` on registration flow.
- `didCreateFirstContentTypeEntry` when `totalEntries === 0`.

Subsequent actions use the non-`First` event (`didCreateContentType`, `didCreateComponent`, …).

### 5. Fire-and-forget / non-blocking

Startup telemetry and many call sites do not `await` the send. Failures are ignored. Timeout on fetch defaults to 1s.

---

## Admin frontend telemetry (separate channel)

See [Admin telemetry (frontend)](/docs/core/admin/features/telemetry) for `useTracking()`, event types, plugin wrappers, and lifecycle events.

New **server-side** features (like MCP) should use `strapi.telemetry.send`, not the React tracking hook.

---

## Adding a new server-side event — checklist

1. **Name** — `did*` past tense; use `didCreateFirst*` or `didInitialize*` when appropriate.
2. **Payload** — put action context in `eventProperties`; project-level counts in `groupProperties`.
3. **Privacy** — avoid PII, secrets, and high-cardinality identifiers (content type UIDs, document IDs) unless strictly necessary.
4. **Volume** — if the action can happen frequently, apply rate limiting or weekly aggregation from day one.
5. **Location** — prefer a `metrics` service in the owning package; call from controller/service after success.
6. **Disable guard** — `strapi.telemetry.send` no-ops when disabled; no extra check needed unless you perform expensive metric computation first.
7. **Tests** — mock `strapi.telemetry.send` in unit tests (see existing `__tests__/metrics.test.ts` files).

---

## API reference

Public API: [Telemetry Service](/api/Telemetry).

Key types: `packages/core/core/src/services/metrics/sender.ts` → `Payload`, `Sender`.
