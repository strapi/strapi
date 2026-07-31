---
title: MCP Server
description: How Strapi's Model Context Protocol (MCP) server is registered, started, authenticated, and extended with tools, prompts, and resources.
tags:
  - core
  - mcp
  - ai
---

# MCP Server

Strapi ships an opt-in [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes content and platform capabilities (tools, prompts, resources) to AI clients over HTTP. It is disabled by default and lives entirely in `@strapi/core`, with `@strapi/content-manager` as its main built-in consumer.

Source: `packages/core/core/src/services/mcp/`, `packages/core/core/src/providers/mcp.ts`, `packages/core/core/src/mcp.ts`. Content-manager integration: `packages/core/content-manager/server/src/mcp/`. Shared types: `packages/core/types/src/modules/mcp.ts`.

## Summary

| Concern       | Answer                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| Enable        | `server.mcp.enabled` (default `false`)                                                                         |
| Endpoint      | `POST /mcp` (fixed path, not configurable)                                                                     |
| Transport     | MCP SDK `StreamableHTTPServerTransport`, stateless (one server instance per request)                           |
| Auth          | Admin API token (`Authorization: Bearer <token>`) — same store as Settings → API Tokens (admin)                |
| Authorization | Two layers: coarse session capability gate (CASL ability vs `auth.policies`) + fine-grained handler checks     |
| Extensibility | Any plugin or app can register tools/prompts/resources via `strapi.ai.mcp.register*` during the register phase |
| Built-in      | One dev-only `log` tool (core) + one CRUD tool set per displayed content type (content-manager)                |
| SDK           | `@modelcontextprotocol/sdk@1.29.0`                                                                             |

## Architecture

```
init        providers/mcp.ts          → strapi.add('ai.mcp', createMcpService)
register    plugins / app             → strapi.ai.mcp.registerTool|Prompt|Resource(...)
bootstrap   plugins (content-manager) → registerContentManagerMcpTools(...)
            providers/mcp.ts          → strapi.ai.mcp.start() → mounts /mcp routes
request     POST /mcp → authenticate → per-request McpServer → sync capabilities → handle → close
```

Two pieces cooperate:

| Piece    | File                                           | Responsibility                                                                                                                                   |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider | `packages/core/core/src/providers/mcp.ts`      | Lifecycle glue only: registers the `ai.mcp` DI key on `init`, calls `start()`/`stop()` on `bootstrap`/`destroy` if enabled.                      |
| Service  | `packages/core/core/src/services/mcp/index.ts` | The real implementation: capability registries, HTTP route mounting, the built-in `log` tool, status tracking (`idle` → `starting` → `running`). |

The provider is registered last in `packages/core/core/src/providers/index.ts`, after `ai` (which creates the `strapi.ai` namespace that `mcp` attaches to).

### Bootstrap ordering matters

Strapi's `bootstrap()` phase runs plugin lifecycles **before** provider lifecycles (`packages/core/core/src/Strapi.ts` — `runPluginsLifecycles(BOOTSTRAP)` runs, then the providers loop runs). Practically:

1. Plugin `bootstrap()` hooks run — this is where content-manager derives and registers its per-content-type tools (`packages/core/content-manager/server/src/bootstrap.ts`).
2. Provider `bootstrap()` hooks run — the `mcp` provider calls `strapi.ai.mcp.start()`, which mounts the `/mcp` routes.
3. The app's own `bootstrap()` (`src/index.ts`) runs **after** providers — too late to register capabilities.

:::caution
Register tools, prompts, and resources from a plugin's `register()` phase (preferred) or `bootstrap()` phase (works, but only for plugins — app-level `bootstrap()` is too late). `strapi.ai.mcp.registerTool/Prompt/Resource` throw once the server has left the `idle` status.
:::

## Configuration

| Key                           | Default | Notes                                                  |
| ----------------------------- | ------- | ------------------------------------------------------ |
| `server.mcp.enabled`          | `false` | Must be `true` to start the server                     |
| `server.mcp.connectTimeoutMs` | `5000`  | Timeout for `mcpServer.connect(transport)` per request |
| `server.mcp.requestTimeoutMs` | `60000` | Timeout for `transport.handleRequest(...)` per request |

Implementation: `packages/core/core/src/services/mcp/internal/McpConfiguration.ts`. Type: `McpConfig` in `packages/core/types/src/core/config/server.ts`.

Dev mode (`autoReload` config) additionally unlocks `devModeOnly` capabilities like the built-in `log` tool — see [Authorization](#authorization).

## Transport & routes

Routes (`packages/core/core/src/services/mcp/routes.ts`):

| Method                             | Path   | Behavior                                                                                          |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `POST`                             | `/mcp` | Real handler — authenticate, then hand off to the MCP SDK transport                               |
| `GET` / `DELETE` / `PUT` / `PATCH` | `/mcp` | JSON-RPC `METHOD_NOT_ALLOWED` (so MCP clients get a parseable error instead of a default 404/405) |

All five routes set `config: { auth: false }` — Strapi's own admin/content-API authentication is bypassed at the router level because MCP performs its **own** authentication inside the handler (see below).

The transport is the MCP SDK's `StreamableHTTPServerTransport` with `sessionIdGenerator: undefined`, i.e. **stateless**: a fresh `McpServer` instance is created and connected for every POST request, then closed in a `finally` block (`packages/core/core/src/services/mcp/handlers/handlePost.ts`).

An OAuth discovery fallback middleware (`middleware/oauthDiscoveryFallback.ts`) intercepts `/.well-known/oauth-*` and `/register` with a plain JSON 404, since some MCP clients probe these paths and would otherwise hit Strapi's default HTML 404 page.

## Authentication

`packages/core/core/src/services/mcp/authentication.ts`:

1. Extract `Authorization: Bearer <token>` — missing/malformed header → `missing_token`.
2. Validate through `strapi.admin.services['api-token-admin'].authenticateAdminToken(token)` — the **same admin API token store** used by Settings → API Tokens. Invalid/expired token → `invalid_token`.
3. On success, the handler receives the token's CASL `ability` and owning `user`.

There is no separate "MCP token" type and no admin-panel screen dedicated to MCP — an admin creates a regular admin API token and uses it as the bearer credential for `/mcp`.

Both failure reasons are reported through telemetry (`didNotAuthenticateMcpRequest`) but returned to the client as a single generic JSON-RPC `AUTHENTICATION_REQUIRED` error — the distinction is for observability, not client-facing signaling.

## Authorization

Authorization happens in two layers.

### 1. Session capability sync (coarse allowlist)

On every request, after authentication, `syncMcpSessionCapabilities` (`packages/core/core/src/services/mcp/internal/syncMcpSessionCapabilities.ts`) walks every registered tool/prompt/resource definition and enables or disables it **for that session's `McpServer` instance** based on:

- `devModeOnly: true` → enabled only if `config.isDevMode()` (i.e. `autoReload` is on); never exposed in production.
- `auth: { policies: [...] }` → enabled if the ability satisfies **any** policy (`ability.can(action, subject)`), OR'd across the array.

This is deliberately coarse — it decides what a client sees in `tools/list` etc. It does **not** replace per-request checks; the source comment is explicit: _"Field/entity conditions must be enforced by capability handlers with request-specific context."_

### 2. Handler-level checks (fine-grained)

Content-manager's derived tools re-run the same `permission-checker` service used by REST controllers inside each handler: entity-level checks (can this user act on _this_ document?), field-level filtering (`getPermittedFields`), and locale filtering (`resolvePermittedLocaleSchema`) — all computed **per request**, from the caller's ability, and folded directly into the tool's Zod input/output schema via `resolveInputSchema`/`resolveOutputSchema`. A user with `read` on an article but not on its `body` field never sees `body` in the tool's schema or output.

Custom tools should follow the same pattern: use `auth.policies` for the coarse gate, then call into the same policy/permission services your REST controllers use for the fine-grained checks.

## Defining and registering capabilities

Public builders are re-exported from `@strapi/core` / `@strapi/strapi` as `ai.mcp.defineTool`, `ai.mcp.definePrompt`, `ai.mcp.defineResource` (`packages/core/core/src/mcp.ts` → `services/mcp/{tool,prompt,resource}-registry.ts`). They are identity functions at runtime — their only job is inferring/narrowing TypeScript types (input/output schema shape, `devModeOnly` vs `auth` access variant).

```ts
import { ai } from '@strapi/strapi';
import { z } from '@strapi/utils';

const greet = ai.mcp.defineTool({
  name: 'greet',
  title: 'Greet',
  description: 'Greets a user by name',
  auth: { policies: [{ action: 'plugin::my-plugin.greet' }] },
  resolveInputSchema: () => z.object({ name: z.string() }),
  resolveOutputSchema: () => z.object({ message: z.string() }),
  createHandler:
    (strapi) =>
    async ({ args }) => {
      const message = `Hello, ${args.name}!`;
      return { content: [{ type: 'text', text: message }], structuredContent: { message } };
    },
});

// in a plugin's register() (preferred) or bootstrap():
strapi.ai.mcp.registerTool(greet);
```

`registerPrompt` and `registerResource` follow the same shape (`argsSchema`/`createHandler` returning a `GetPromptResult`, and `uri`/`metadata`/`createHandler` returning a `ReadResourceResult`, respectively). All three throw if called once `strapi.ai.mcp` has left the `idle` status.

### Fault isolation

`createSafeCapabilityRegistration` (`services/mcp/utils/createSafeCapabilityRegistration.ts`) wraps every registration in three layers of error containment so one broken plugin tool cannot take down the MCP server or other capabilities:

1. **Factory errors** — if `createHandler(strapi)` throws while building the handler, a fallback handler is substituted that always returns an error result to the client.
2. **Runtime errors** — if the handler throws while executing, `wrapSafeHandler` catches it and returns a capability-shaped error result (`isError: true` for tools) instead of crashing the request.
3. **SDK registration errors** — if the MCP SDK itself rejects the registration call, the capability is replaced with a permanently-disabled no-op instead of aborting the whole registration loop.

## Built-in tools (core)

| Tool  | Access        | Purpose                                                                                                                                                                                           |
| ----- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `log` | `devModeOnly` | Writes a sanitized message to `strapi.log` at a given level; used for local debugging of MCP clients. Input is length-capped and stripped of control/ANSI characters and newlines before logging. |

Source: `packages/core/core/src/services/mcp/tools/log.ts`.

## Content Manager tools

Content-manager derives one MCP tool set per **displayed** content type at bootstrap time (`packages/core/content-manager/server/src/mcp/register-content-manager-mcp-tools.ts` → `deriveDisplayedContentTypeMcpToolDefinitions` in `derive-content-type-mcp-tools.ts`). Nothing is derived if MCP is disabled — the (relatively expensive) derivation is skipped entirely.

### Tool naming

`slugifyUidForMcpToolName` (`packages/core/content-manager/server/src/mcp/utils.ts`) turns a content-type UID into a tool-name segment:

- `api::article.article` → `article`
- `plugin::i18n.locale` → `plugin-i18n_locale`

### Collection types

| Tool                   | Action    | Notes                                                  |
| ---------------------- | --------- | ------------------------------------------------------ |
| `list_{slug}`          | read      | Paginated list with filters/sort/locale/status         |
| `get_{slug}`           | read      | Single document by `documentId`                        |
| `create_{slug}`        | create    | Sets creator fields from the token's user              |
| `update_{slug}`        | update    | Updates the draft, or creates a locale version         |
| `delete_{slug}`        | delete    | Deletes a document or a locale version                 |
| `publish_{slug}`       | publish   | Only if `draftAndPublish` is enabled                   |
| `unpublish_{slug}`     | unpublish | Only if `draftAndPublish`; optional `discardDraft`     |
| `discard_{slug}_draft` | discard   | Only if `draftAndPublish`; restores published as draft |

### Single types

| Tool                                                           | Action        | Notes                                                    |
| -------------------------------------------------------------- | ------------- | -------------------------------------------------------- |
| `get_{slug}`                                                   | read          | Reads the single document                                |
| `write_{slug}`                                                 | create/update | Upserts the draft                                        |
| `delete_{slug}`                                                | delete        | Deletes / locale-deletes                                 |
| `publish_{slug}` / `unpublish_{slug}` / `discard_{slug}_draft` | —             | Same semantics as collection types, if `draftAndPublish` |

There are no content-manager MCP _prompts_ or _resources_, and no separate "describe schema" tool — schema introspection is implicit in each tool's Zod input/output schema, which an MCP client reads from `tools/list`.

### Output shaping

Two extra steps run before a document is returned to an MCP client (`packages/core/content-manager/server/src/mcp/utils.ts` → `sanitizeFormatShape`; `sanitizers/shape-relations.ts`):

1. Standard permission-checker sanitization (same as REST).
2. Relations are reduced to **identity-only** references (`shapeRelationsForMcp`) rather than the fuller shapes REST responses use — relations are not meant to be traversed as full objects by an MCP client.

## Errors

| Layer                                                          | Behavior                                                                                                                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route-level (auth failure, method not allowed, uncaught error) | `sendJsonRpcError` (`utils/jsonRpcErrors.ts`) — a real JSON-RPC error body (`AUTHENTICATION_REQUIRED` -32000, `METHOD_NOT_ALLOWED` -32601, `INTERNAL_ERROR` -32603), never a plain-text/HTML error, so MCP clients can parse it. |
| Capability handler throws                                      | `wrapSafeHandler` catches it, logs, and returns a capability-shaped error result (`isError: true` for tools) instead of propagating.                                                                                             |
| Registration-time errors                                       | See [Fault isolation](#fault-isolation) above.                                                                                                                                                                                   |
| Slow connect/handle                                            | `withTimeout` (`utils/withTimeout.ts`) enforces `connectTimeoutMs` / `requestTimeoutMs`.                                                                                                                                         |

## Telemetry

MCP emits its own server-side telemetry events (`didStartMcpServer`, `didUseMcpServer`, `didNotAuthenticateMcpRequest`, `didNotHandleMcpRequest`, `didExecuteMcpCapability`, `didNotExecuteMcpCapability`) — see the [MCP section](/docs/core/strapi/telemetry#mcp-core) of the server-side telemetry doc for event shapes and rate-limiting details. Implementation: `packages/core/core/src/services/mcp/metrics/`.

## Tests

| Path                                                                                           | Covers                                                     |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `packages/core/core/src/services/mcp/__tests__/`                                               | Route registration, disabled skip, service integration     |
| `packages/core/core/src/services/mcp/__tests__/authentication.test.ts`                         | Bearer parsing, missing/invalid/valid token                |
| `packages/core/core/src/services/mcp/handlers/__tests__/handlePost.test.ts`                    | Auth failure, timeouts, transport wiring                   |
| `packages/core/core/src/services/mcp/internal/__tests__/`                                      | Configuration, server factory, capability sync, registries |
| `packages/core/content-manager/server/src/mcp/__tests__/derive-content-type-mcp-tools.test.ts` | Tool derivation per content type                           |
| `packages/core/content-manager/server/src/mcp/sanitizers/__tests__/shape-relations.test.ts`    | Relation shaping                                           |
| `tests/api/core/mcp/mcp-auth.test.api.ts`                                                      | End-to-end admin-token auth + `tools/list`                 |
| `tests/api/core/mcp/mcp-content-manager-rbac.test.api.ts`                                      | RBAC on derived tools                                      |
| `tests/api/core/mcp/mcp-content-manager-shaping.test.api.ts`                                   | Relation shaping, end to end                               |

## Alternatives

- If you need to expose data to a human through the admin panel, this is not the right layer — build a normal admin UI / API route instead.
- If you need server-to-server automation without an AI client in the loop, use the [Document Service](/docs/core/content-manager) or REST/GraphQL APIs directly rather than going through MCP.
- If you only need request-scoped structured logging for debugging, prefer `strapi.log` directly; the `log` MCP tool exists specifically for MCP client-side debugging, not general application logging.
