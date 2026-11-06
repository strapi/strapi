---
title: MCP Server
description: How Strapi's Model Context Protocol (MCP) server is registered, started, authenticated, and extended with tools, prompts, and resources.
---

# MCP Server

Strapi ships an opt-in [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes content and platform capabilities (tools, prompts, resources) to AI clients over HTTP. It is disabled by default and lives entirely in `@strapi/core`, with `@strapi/content-manager` as its main built-in consumer.

Source: `packages/core/core/src/services/mcp/`, `packages/core/core/src/providers/mcp.ts`, `packages/core/core/src/mcp.ts`. Content-manager integration: `packages/core/content-manager/server/src/mcp/`. Shared types: `packages/core/types/src/modules/mcp.ts`.

## Summary

| Concern       | Answer                                                                                                                                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enable        | `server.mcp.enabled` (default `false`)                                                                                                                                                                                                                                      |
| Endpoint      | `POST /mcp` (fixed path, not configurable)                                                                                                                                                                                                                                  |
| Transport     | MCP SDK `NodeStreamableHTTPServerTransport`, stateless (one server instance per request)                                                                                                                                                                                    |
| Auth          | Admin API token (`Authorization: Bearer <token>`) — same store as Settings → API Tokens (admin). With `server.mcp.oauth.enabled`, additionally OAuth 2.1 access tokens issued by the built-in authorization server (see [OAuth 2.1 authorization](#oauth-21-authorization)) |
| Authorization | Two layers: coarse session capability gate (CASL ability vs `auth.policies`) + fine-grained handler checks                                                                                                                                                                  |
| Extensibility | Any plugin or app can register tools/prompts/resources via `strapi.ai.mcp.register*` during the register phase                                                                                                                                                              |
| Built-in      | One dev-only `log` tool (core) + one CRUD tool set per displayed content type (content-manager)                                                                                                                                                                             |
| SDK           | `@modelcontextprotocol/server@2.0.0` + `@modelcontextprotocol/node@2.0.0`                                                                                                                                                                                                   |

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

| Key                               | Default | Notes                                                                                                                                               |
| --------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server.mcp.enabled`              | `false` | Must be `true` to start the server                                                                                                                  |
| `server.mcp.connectTimeoutMs`     | `5000`  | Timeout for `mcpServer.connect(transport)` per request                                                                                              |
| `server.mcp.requestTimeoutMs`     | `60000` | Timeout for `transport.handleRequest(...)` per request                                                                                              |
| `server.mcp.maxToolInputElements` | `10000` | Max array elements and object keys combined in one tool call's arguments. Must be an integer >= 1. Set to `Infinity` to disable (JS/TS config only) |

Implementation: `packages/core/core/src/services/mcp/internal/McpConfiguration.ts`. Type: `McpConfig` in `packages/core/types/src/core/config/server.ts`.

Dev mode (`autoReload` config) additionally unlocks `devModeOnly` capabilities like the built-in `log` tool — see [Authorization](#authorization).

## Transport & routes

Routes (`packages/core/core/src/services/mcp/routes.ts`):

| Method                             | Path   | Behavior                                                                                          |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `POST`                             | `/mcp` | Real handler — authenticate, then hand off to the MCP SDK transport                               |
| `GET` / `DELETE` / `PUT` / `PATCH` | `/mcp` | JSON-RPC `METHOD_NOT_ALLOWED` (so MCP clients get a parseable error instead of a default 404/405) |

All five routes set `config: { auth: false }` — Strapi's own admin/content-API authentication is bypassed at the router level because MCP performs its **own** authentication inside the handler (see below).

The transport is the MCP SDK's `NodeStreamableHTTPServerTransport` with `sessionIdGenerator: undefined`, i.e. **stateless**: a fresh `McpServer` instance is created and connected for every POST request, then closed in a `finally` block (`packages/core/core/src/services/mcp/handlers/handlePost.ts`).

Each tool call permits at most `server.mcp.maxToolInputElements` (default 10,000) array elements and object keys combined in its arguments. The SDK rejects larger arguments before schema validation or handler execution.

Every tool is registered on each per-request server, but only some tools resolve their Zod schemas, because `resolveInputSchema`/`resolveOutputSchema` is the main per-request cost. `resolveToolSchemaScope` (`internal/resolveToolSchemaScope.ts`) reads the JSON-RPC body before the server is built: `tools/list` needs every tool, `tools/call` needs only the called tool, and other messages (`initialize`, notifications) need none. A tool resolves its schemas only when it is in that scope **and** the token may use it (`canUseMcpCapability`). The other tools are registered without schemas and with a handler that only returns an error, so a call to a tool the token cannot use still gets the SDK's `Tool <name> disabled` error.

An OAuth discovery fallback middleware (`middleware/oauthDiscoveryFallback.ts`) intercepts `/.well-known/oauth-*` and `/register` with a plain JSON 404, since some MCP clients probe these paths and would otherwise hit Strapi's default HTML 404 page. It only fires when downstream already answered 404/405, so when OAuth is enabled the real discovery routes shadow it.

## Authentication

`packages/core/core/src/services/mcp/authentication.ts` is a dispatcher (`createMcpAuthenticationStrategy`):

1. Extract `Authorization: Bearer <token>` — missing/malformed header → `missing_token`.
2. If the token is JWT-shaped (contains two `.`) **and** `server.mcp.oauth.enabled` is on, it is treated as an MCP OAuth access token (`oauth/accessTokenAuthenticator.ts`): validated against the `mcp` session-manager origin, requiring an active session row, an active non-blocked admin user, and a freshly computed `generateUserAbility`. Admin API tokens are long random hex strings that can never contain a dot, so the dispatch is unambiguous.
3. Otherwise it validates through `strapi.admin.services['api-token-admin'].authenticateAdminToken(token)` — the **same admin API token store** used by Settings → API Tokens. Invalid/expired token → `invalid_token`.
4. On success, the handler receives the caller's CASL `ability` and owning `user`.

There is no separate "MCP token" type — an admin creates a regular admin API token and uses it as the bearer credential for `/mcp`, or an MCP client obtains an OAuth token through the flow below.

Both failure reasons are reported through telemetry (`didNotAuthenticateMcpRequest`) but returned to the client as a single generic JSON-RPC `AUTHENTICATION_REQUIRED` error — the distinction is for observability, not client-facing signaling. When OAuth is enabled, the 401 additionally carries `WWW-Authenticate: Bearer resource_metadata="<url>"` (RFC 9728) so OAuth-capable clients can discover the authorization server.

## OAuth 2.1 authorization

Opt-in OAuth 2.1 authorization server for MCP clients (Claude, Cursor, …), implemented in `packages/core/core/src/services/mcp/oauth/` and mounted from the MCP service's `start()` when `server.mcp.oauth.enabled` is `true`. It implements the MCP authorization spec: protected resource metadata (RFC 9728), authorization server metadata (RFC 8414), the authorization code grant with mandatory PKCE S256, refresh token rotation with reuse detection, dynamic client registration (RFC 7591), revocation (RFC 7009), and the `resource` parameter (RFC 8707).

### Configuration

| Key                                          | Default       | Notes                                                             |
| -------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| `server.mcp.oauth.enabled`                   | `false`       | Must be `true` (with `server.mcp.enabled`) to mount the endpoints |
| `server.mcp.oauth.dynamicClientRegistration` | `true`        | `false` removes `POST /mcp/oauth/register` and the metadata entry |
| `server.mcp.oauth.accessTokenLifespan`       | `1800` (30 m) | Seconds                                                           |
| `server.mcp.oauth.idleRefreshTokenLifespan`  | 14 days       | Seconds                                                           |
| `server.mcp.oauth.maxRefreshTokenLifespan`   | 30 days       | Seconds                                                           |
| `server.mcp.oauth.authorizationCodeLifespan` | `120`         | Seconds, single-use codes                                         |
| `server.mcp.oauth.consentTicketLifespan`     | `300`         | Seconds, signed consent handoff ticket                            |

### Endpoints

Public endpoints (unprefixed, `auth: false`, OAuth semantics inside the handlers — `oauth/routes.ts`):

| Method/Path                                         | Purpose                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /.well-known/oauth-protected-resource[/mcp]`   | RFC 9728 resource metadata                                                      |
| `GET /.well-known/oauth-authorization-server[/mcp]` | RFC 8414 authorization server metadata                                          |
| `GET /mcp/oauth/authorize`                          | Validates the request, redirects to the admin consent page with a signed ticket |
| `POST /mcp/oauth/token`                             | `authorization_code` (PKCE required) + `refresh_token` grants                   |
| `POST /mcp/oauth/register`                          | RFC 7591 dynamic client registration (rate limited per IP)                      |
| `POST /mcp/oauth/revoke`                            | RFC 7009 revocation                                                             |

Consent endpoints, mounted on the **admin router** so the admin session strategy (including SSO) applies:

| Method/Path                                  | Purpose                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `GET /admin/mcp/oauth/authorization-request` | Returns display data for a pending request (consent screen)            |
| `POST /admin/mcp/oauth/consent`              | Records approve/deny; issues the code; returns the client redirect URL |

The consent POST additionally requires `ctx.state.session` (set only by the human session strategy), so admin API tokens cannot approve grants.

### Flow

1. The MCP client gets a 401 from `/mcp` with `WWW-Authenticate: Bearer resource_metadata=...`, discovers the metadata, and (usually) self-registers.
2. `GET /mcp/oauth/authorize` validates `client_id`, exact `redirect_uri` match, `response_type=code`, PKCE S256 and the optional `resource`, signs a short-lived **consent ticket** (JWT, derived secret, aud `strapi-mcp-oauth-consent`), and 302-redirects the browser to the admin panel page `/admin/mcp/oauth/consent?ticket=…` (`packages/core/admin/admin/src/pages/OAuthConsentPage.tsx`). Unauthenticated admins pass through the normal login (the `redirectTo` mechanism, persisted across the SSO round trip via `sessionStorage`). Every validation failure answers 400 JSON in place, never an error redirect: registration is open, so an automatic redirect to a registered URI would make the endpoint an open redirector. The browser only leaves the Strapi origin after the admin acts on the consent screen, and the consent screen never puts the self-reported client name in its heading.
3. On approval, the server issues a single-use authorization code (stored hashed in `admin::mcp-oauth-authorization-code`) bound to the client, redirect URI, PKCE challenge, approving admin user, and a fresh `grantId`; the browser is sent back to the client's redirect URI with `code`, `state`, and `iss` (RFC 9207).
4. `POST /mcp/oauth/token` authenticates the client (`none`, `client_secret_basic`, or `client_secret_post`), consumes the code atomically, verifies PKCE, and issues tokens through `strapi.sessionManager('mcp')`: the JWT access token and a rotating refresh token persisted in `strapi_sessions` with `deviceId = grantId` and `{clientId, scope, resource}` in the session `metadata`.

### Grant model and revocation

A grant acts **as the approving admin user**: every `/mcp` request recomputes `generateUserAbility(user)`, so RBAC changes apply immediately and deactivating/blocking the user cuts access on the next request. Revocation paths all delete the grant's session family (`invalidateRefreshToken(userId, grantId)`):

- `POST /mcp/oauth/revoke` with either token of the grant.
- Replay of a consumed authorization code (consumed rows are kept until expiry for detection).
- Replay of a rotated-out refresh token, or presentation of a refresh token by the wrong client.
- The user's password change, password reset, and "sign out of all devices" (`invalidateMcpSessions` in `packages/core/admin/shared/utils/session-auth.ts`).

Grant approvals, denials, revocations, and replay detections are logged through `strapi.log` (`[MCP]` prefix). Access tokens die with their session because the authenticator checks `isSessionActive` per request. Caveat (same as admin panel sessions): after a normal rotation, the _previous_ access token stays valid until its own `exp` (≤ `accessTokenLifespan`).

### Storage

Two hidden `admin::` content-types (`packages/core/admin/server/src/content-types/`): `mcp-oauth-client` (`strapi_mcp_oauth_clients`, secrets stored as HMAC-SHA512 hashes keyed with `admin.apiToken.salt`) and `mcp-oauth-authorization-code` (`strapi_mcp_oauth_codes`, hashed single-use codes). A dynamically registered client that never gets a grant (`lastGrantedAt` stays null) is deleted after 24 hours, lazily from the registration endpoint, so open registration cannot fill the table. Tokens live in the existing session store under the `mcp` origin; the origin's JWT secret is derived from `admin.auth.secret` (HMAC-SHA256 with a fixed label) so MCP JWTs are not interchangeable with admin panel JWTs, on top of the session-origin check.

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

## Advertised schema wire contract

The `inputSchema` and optional `outputSchema` returned by `tools/list` are JSON Schema 2020-12
documents. A schema can declare this dialect with
`https://json-schema.org/draft/2020-12/schema` or omit `$schema`; the MCP specification defines an
absent declaration as 2020-12. Capability authors and clients must interpret the document
structurally as 2020-12. For example, positional tuples use `prefixItems`, and generated recursive
schemas use `$defs` rather than the older `definitions` container.

Strapi passes each capability's authored Zod schema to the MCP SDK. Zod serializes it and the SDK
advertises that result. Strapi does not rewrite or re-serialize advertised schemas. This boundary is
covered by tests that enumerate through a real MCP client and through an authenticated `/mcp`
request, then compile every advertised input and output schema as 2020-12.

### Current content-manager schema observations

The known SDK conversion hazards are tracked upstream in
[#2464](https://github.com/modelcontextprotocol/typescript-sdk/issues/2464) and
[#2636](https://github.com/modelcontextprotocol/typescript-sdk/issues/2636). Authenticated
enumeration of real content-manager tools currently shows:

- Date, datetime, time, and timestamp write fields are advertised as strings. Content-manager does
  not author these fields with `z.date()`, so the date conversion failure in #2464 is not present.
- Content-manager output schemas contain no defaulted fields, so the defaulted-output mismatch in
  #2464 is not present.
- Extra-property declarations follow the authored object behavior: strict write-data objects
  advertise `additionalProperties: false`, loose output objects advertise an open
  `additionalProperties` schema, and ordinary input objects can omit the keyword. The omission
  described in #2636 is present, but it remains valid JSON Schema 2020-12 and does not drop any
  content-manager tool in strict schema validation.

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

`registerPrompt` and `registerResource` follow the same shape (`argsSchema`/`createHandler` returning an `McpPromptResult`, and `uri`/`metadata`/`createHandler` returning an `McpResourceReadResult`, respectively). All three throw if called once `strapi.ai.mcp` has left the `idle` status.

### Capability results

Strapi owns every value a capability author constructs, so no result requires naming an MCP SDK
type. All of them live in `@strapi/types` (`Modules.MCP`):

| Type                         | What it describes                                                        |
| ---------------------------- | ------------------------------------------------------------------------ |
| `McpToolResult`              | Tool content plus either successful structured data or an `isError` flag |
| `McpPromptResult`            | A prompt's description and messages                                      |
| `McpResourceReadResult`      | What a resource read returns                                             |
| `McpResourceListingMetadata` | What a resource advertises at registration, before anyone reads it       |
| `McpContentBlock`            | One block of tool or prompt content                                      |

`McpToolHandlerReturn` remains an alias of `McpToolResult`, so existing handler annotations keep
compiling unchanged.

`McpContentBlock` is a five-variant union: `text`, `image`, `audio`, `resource_link`, and
`resource` (an embedded resource). Resource contents come in a `text` or a base64 `blob` form.
Protocol extension metadata (`_meta`) and arbitrary extension fields on prompt and resource read
results reach the client unchanged.

`services/mcp/utils/toSdkMcpCapabilityResult.ts` is the outbound counterpart to the handler-context
translator: it maps each Strapi-owned variant onto the protocol shape the SDK transports. A variant
the protocol gains later becomes available to capability authors only once Strapi adds it to the
owned contract, so an SDK change cannot alter Strapi's public API on its own. The SDK remains the
final protocol validator, and structured-output validation is unchanged: a successful tool result
must still satisfy the advertised output schema.

### Handler context

Capability handlers retain Strapi's positional or `{ args, extra }` API. Strapi owns the `extra`
handler-context contract and translates the underlying transport's request facts into it. Capability
authors do not depend on an MCP SDK context type.

Every member is optional because availability varies by request and transport:

| Member        | Meaning                                                  |
| ------------- | -------------------------------------------------------- |
| `signal`      | Cancellation signal for the invocation                   |
| `requestId`   | JSON-RPC request identifier                              |
| `sessionId`   | Transport session identifier, when session state exists  |
| `authInfo`    | Information about a token authenticated by the transport |
| `_meta`       | Complete request metadata                                |
| `requestInfo` | Originating HTTP request information                     |

Strapi preserves the established meaning of these names. `_meta` includes ordinary request metadata
and reserved MCP protocol keys, even when the SDK handles those groups separately. `requestInfo`
uses `{ headers, url? }`; `headers` is a plain mapping, so existing access such as
`extra.requestInfo?.headers.authorization` continues to work.

Server-initiated client messaging, SSE stream-closing controls, and experimental task facilities are
not part of Strapi's handler context. There is no escape hatch to the SDK context. Code that reads
one of these excluded fields fails the TypeScript check instead of receiving `undefined` at runtime.

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
- `api::writer.editor` → `writer_editor` (api name and content-type name differ, so both are kept)
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

MCP emits its own server-side telemetry events (`didStartMcpServer`, `didUseMcpServer`, `didNotAuthenticateMcpRequest`, `didNotHandleMcpRequest`, `didExecuteMcpCapability`, `didNotExecuteMcpCapability`) — see the [MCP section](./telemetry.md#mcp-core) of the server-side telemetry doc for event shapes and rate-limiting details. Implementation: `packages/core/core/src/services/mcp/metrics/`.

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
- If you need server-to-server automation without an AI client in the loop, use the [Document Service](../content-manager/index.md) or REST/GraphQL APIs directly rather than going through MCP.
- If you only need request-scoped structured logging for debugging, prefer `strapi.log` directly; the `log` MCP tool exists specifically for MCP client-side debugging, not general application logging.
