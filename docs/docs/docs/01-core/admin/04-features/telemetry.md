---
title: Admin telemetry (frontend)
description: How the admin panel sends usage events from the browser — useTracking, event types, and plugin patterns.
tags:
  - admin
  - telemetry
  - analytics
---

The admin panel sends usage events **directly from the browser** to the Strapi analytics hub. This is separate from server-side telemetry (`strapi.telemetry.send`) documented in [Server-side telemetry](/docs/core/strapi/telemetry).

For the public overview of collected data, see [Usage information](https://docs.strapi.io/developer-docs/latest/getting-started/usage-information.html).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  React components / hooks                                        │
│    trackUsage('didSaveContentType')                              │
│    trackUsage('didCreateEntry', { documentId, status })          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  packages/core/admin/admin/src/features/Tracking.tsx             │
│    TrackingProvider  → context (uuid, telemetryProperties)       │
│    useTracking()     → trackUsage()                              │
└────────────┬───────────────────────────────┬───────────────────────┘
             │                               │
             │ GET /admin/telemetry-properties│ POST /api/v2/track
             ▼                               ▼
     Strapi backend                   analytics.strapi.io
     (group metadata)                 (override: STRAPI_ANALYTICS_URL)
```

There is **no server proxy** for routine UI events — the admin SPA posts to the analytics endpoint with `axios`. Failures are swallowed; tracking never blocks UI flows.

---

## Core API

### `useTracking()`

Primary hook for admin and plugins:

```tsx
import { useTracking } from '@strapi/admin/strapi-admin';

const MyComponent = () => {
  const { trackUsage } = useTracking();

  const handleSave = () => {
    trackUsage('didSaveContentType');
    // or with properties:
    trackUsage('didCreateEntry', { documentId: 'abc', status: 'draft' });
  };
};
```

Implementation: `packages/core/admin/admin/src/features/Tracking.tsx`.

Exported from `@strapi/admin` via `packages/core/admin/admin/src/index.ts`.

### `TrackingProvider`

Mounted in `packages/core/admin/admin/src/components/Providers.tsx`, wrapping the authenticated app tree.

Responsibilities:

1. Reads project `uuid` from `useInitQuery()` (`GET /admin/init`).
2. Fetches `telemetryProperties` via `useTelemetryPropertiesQuery()` when the user is logged in.
3. Fires **`didInitializeAdministration`** once when both `uuid` and telemetry properties are available (anonymous — empty `userId`).

---

## When events are sent (opt-in gates)

`trackUsage` only fires when **all** of the following are true:

| Gate                                        | Source                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| Project `uuid` is truthy                    | `GET /admin/init` — `false` when telemetry is disabled in `package.json` |
| `window.strapi.telemetryDisabled === false` | Set at build time from `STRAPI_TELEMETRY_DISABLED` in `render.ts`        |

If either gate fails, `trackUsage` returns `null` without making a network request.

Server-side `strapi.telemetry.isDisabled` also affects whether `/admin/telemetry-properties` returns data (204 when disabled), so group metadata is unavailable when telemetry is off.

---

## Request payload

Each `trackUsage` call POSTs to:

```
${STRAPI_ANALYTICS_URL || 'https://analytics.strapi.io'}/api/v2/track
```

Body shape (same endpoint as server-side telemetry):

| Field                       | Frontend source                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `event`                     | First argument to `trackUsage`                                                                 |
| `userId`                    | SHA-256 hash of admin email (`hashAdminUserEmail` in `AuthenticatedLayout`)                    |
| `eventProperties`           | Second argument to `trackUsage` (action-specific)                                              |
| `userProperties.deviceType` | `'desktop' \| 'tablet' \| 'mobile'` from `useDeviceType()` (user-agent heuristic)              |
| `groupProperties`           | Spread of `telemetryProperties` + `projectId: uuid` + `projectType: window.strapi.projectType` |

Header: `X-Strapi-Event: <event name>`.

### Group properties from the server

`GET /admin/telemetry-properties` (`packages/core/admin/server/src/controllers/admin.ts`):

- `useTypescriptOnServer`, `useTypescriptOnAdmin`
- `isHostedOnStrapiCloud`
- `numberOfAllContentTypes`, `numberOfComponents`, `numberOfDynamicZones`

Requires authenticated admin. Returns 204 when `strapi.telemetry.isDisabled`.

---

## Lifecycle / session events

These fire automatically — you usually do not add them in feature code:

| Event                                  | When                                        | Notes                                                        |
| -------------------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `didInitializeAdministration`          | First load with uuid + telemetry properties | Anonymous (`userId: ''`); uses raw `fetch`, not `trackUsage` |
| `didAccessAuthenticatedAdministration` | Authenticated layout mount                  | Includes `registeredWidgets`, `projectId`                    |

`didAccessAuthenticatedAdministration` is sent from `packages/core/admin/admin/src/layouts/AuthenticatedLayout.tsx` when `projectId` becomes available.

---

## Event naming conventions

Same vocabulary as server-side telemetry, with more **`will*`** intent events (user started an action in UI):

| Pattern   | Meaning                           | Examples                                                  |
| --------- | --------------------------------- | --------------------------------------------------------- |
| `will*`   | User initiated / about to perform | `willCreateEntry`, `willNavigate`, `willSaveContentType`  |
| `did*`    | Completed action                  | `didCreateEntry`, `didSaveContentType`, `didPublishEntry` |
| `didNot*` | Failed or cancelled               | `didNotCreateEntry`, `didNotDeleteEntry`                  |

Event names are defined as a **TypeScript union** in `Tracking.tsx` (`TrackingEvent`). Known events split into:

- `EventWithoutProperties` — no second argument
- `EventsWithProperties` — typed property shapes per event (content manager entries, media library, tokens, guided tour, etc.)

Adding a new event requires updating the union in `Tracking.tsx` so callers get type checking and autocomplete.

---

## Plugin and package patterns

Plugins import `useTracking` from `@strapi/admin/strapi-admin` and call `trackUsage` in components or hooks. Major consumers:

| Package                        | Typical events                                            |
| ------------------------------ | --------------------------------------------------------- |
| `@strapi/admin`                | Settings, roles, tokens, navigation, guided tour, widgets |
| `@strapi/content-manager`      | Entry CRUD, bulk actions, list config, filters, history   |
| `@strapi/content-type-builder` | Schema editing, AI chat (via wrapper below)               |
| `@strapi/upload`               | Media library actions (via wrapper below)                 |
| `@strapi/content-releases`     | `didPublishRelease`                                       |

### Wrapper hooks (enrich properties, don't replace the API)

**Content-type builder — `useCTBTracking`**

`packages/core/content-type-builder/admin/src/components/CTBSession/useCTBTracking.ts`

Wraps `useTracking` and merges `ctbSessionId` into every event's properties. Accepts arbitrary event name strings (relaxed typing for CTB-specific events).

**Upload — `useTracking`**

`packages/core/upload/admin/src/hooks/useTracking.ts`

Wraps `useTracking` and adds `isAiMediaLibraryConfigured` when AI is available (mirrors server upload metrics pattern).

When adding plugin telemetry, prefer wrapping the core hook if you need consistent extra properties — do not POST to analytics directly.

---

## Other analytics endpoints (not `trackUsage`)

These bypass `Tracking.tsx` but hit the same analytics host:

| Endpoint             | Component                     | Purpose                                        |
| -------------------- | ----------------------------- | ---------------------------------------------- |
| `POST /api/v2/track` | `Tracking.tsx`, `useTracking` | Standard events                                |
| `POST /register`     | `UseCasePage.tsx`             | First-admin persona registration (email, role) |
| `POST /submit-nps`   | `NpsSurvey.tsx`               | NPS survey responses — see [NPS](./nps.md)     |

---

## Volume and rate limiting

Unlike server-side telemetry, the **admin frontend has no rate limiter or batching**. Every `trackUsage` call that passes the opt-in gates results in one HTTP request.

Conventions that keep volume reasonable in practice:

- Pair **`will*`** with **`did*`** / **`didNot*`** only at meaningful completion points (not on every keystroke).
- Prefer property **categories** over high-cardinality identifiers where possible (though some events do include `documentId`).
- Navigation tracking (`willNavigate`) fires on menu clicks, not on every route render.

Do not add per-render or high-frequency tracking without an explicit product need.

---

## `window.strapi` telemetry fields

Set in `packages/core/admin/admin/src/render.ts`:

```typescript
window.strapi.telemetryDisabled = process.env.STRAPI_TELEMETRY_DISABLED === 'true';
window.strapi.projectType = 'Community' | 'Enterprise'; // updated after /admin/project-type
```

Typed in `packages/core/admin/admin/custom.d.ts`.

---

## Adding a new frontend event — checklist

1. **Choose a name** — follow `will*` / `did*` / `didNot*` conventions.
2. **Update types** — add to `EventWithoutProperties` or create a new interface in `Tracking.tsx` and include it in `EventsWithProperties`.
3. **Call `trackUsage`** from the component or hook at the right lifecycle moment (button click, mutation success/error).
4. **Properties** — use `eventProperties` for action context; rely on automatic `groupProperties` / `userProperties` for project and device metadata.
5. **Plugin?** — import from `@strapi/admin/strapi-admin`; consider a wrapper hook if every event needs extra fields.
6. **Tests** — mock `axios.post` and/or `useTracking` (see `Tracking.test.tsx` and plugin `__mocks__/useTracking.ts`).

Do **not** add frontend tracking for features that only exist server-side (e.g. MCP) — use `strapi.telemetry.send` instead.

---

## Testing

`packages/core/admin/admin/src/features/tests/Tracking.test.tsx` covers:

- Payload shape (`userId`, `eventProperties`, `groupProperties`, `userProperties.deviceType`)
- No request when `telemetryDisabled` or missing `uuid`
- Graceful failure when `axios.post` rejects

Plugin tests often use `jest.mock('@strapi/admin/strapi-admin', () => ({ useTracking: … }))` or local `__mocks__/useTracking.ts`.

---

## Related docs

- [Server-side telemetry](/docs/core/strapi/telemetry) — `strapi.telemetry`, rate limiting, cron aggregates
- [NPS](/docs/core/admin/features/nps) — survey timing and `/submit-nps`
- [Telemetry Service](/api/Telemetry) — public `telemetry.send()` reference (server)
