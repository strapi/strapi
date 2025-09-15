---
title: Sessions and JWT
description: How admin and Content API authentication works with SessionManager, tokens, and configuration.
---

This page summarizes how authentication works in this repository for:

- Admin (back office)
- Content API via users-permissions plugin (UP)

It is intentionally concise for contributors working in the monorepo.

## SessionManager

Core provides a `SessionManager` that issues:

- Short‑lived access tokens (JWT, used in `Authorization: Bearer <token>`)
- Refresh/session tokens (JWT, stored/handled differently per origin)

Per-origin configuration is defined at bootstrap time with:

- `jwtSecret`
- `accessTokenLifespan` (seconds)
- `maxRefreshTokenLifespan`, `idleRefreshTokenLifespan` (seconds)
- `maxSessionLifespan`, `idleSessionLifespan` (seconds)

### Lifespan settings and semantics

All durations are expressed in seconds. These semantics apply to both Admin and Users & Permissions. Values are only converted to milliseconds when interacting with Date and cookie APIs.

- accessTokenLifespan: How long an access token is valid before a new one needs to be requested
- maxRefreshTokenLifespan: Absolute lifetime for a refresh token family. After this time, rotations are rejected.
- idleRefreshTokenLifespan: Maximum idle window between refresh rotations. Each successful rotation resets the window.
- maxSessionLifespan: Absolute lifetime for non-remember-me “session” token families (used by Admin and optionally U&P).
- idleSessionLifespan: Maximum idle window for non-remember-me “session” tokens (Admin and optionally U&P).

Each origin stores session rows in `admin::session` (hidden content-type) using the table/collection `strapi_sessions`, containing `userId`, `sessionId`, `deviceId`, `origin`, `expiresAt`, `absoluteExpiresAt`, `status`, `type`.

### Programmatic API (used internally)

This is not a web/HTTP API. It is a programmatic service consumed by:

- the private Admin API (server-side), and
- the public Content API via the users-permissions plugin (server-side).

- `generateRefreshToken(userId, deviceId?, { type?: 'refresh' | 'session' })`
- `rotateRefreshToken(refreshToken)`
- `generateAccessToken(refreshToken)`
- `validateAccessToken(token)`
- `invalidateRefreshToken(userId, deviceId?)`
- `isSessionActive(sessionId)`

Locations:

- Core service: `packages/core/core/src/services/session-manager.ts`
- Types: `packages/core/types/src/modules/session-manager.ts`

## Admin authentication

Admin defines an origin `admin` with config under `admin.auth.sessions.*`.

- Login/Register/Reset password create a refresh/session token and set an httpOnly cookie `strapi_admin_refresh`.
- The response includes the short‑lived access token in `data.token`.
- Clients use `Authorization: Bearer <access token>` for subsequent admin requests.

Endpoints (admin server):

- `POST /admin/login`
- `POST /admin/register` and `POST /admin/register-admin`
- `POST /admin/reset-password`
- `POST /admin/access-token` — rotates the refresh cookie and returns `{ data: { token } }`
- `POST /admin/logout` — clears cookie and revokes refresh tokens; body may include `{ deviceId }` to revoke a single device

Optional request fields on login/register:

- `deviceId` (UUID). When provided, enables device-scoped revocation.
- `rememberMe` (boolean). When true, uses the long-lived refresh family and sets a persistent cookie; otherwise uses session family (session cookie).

Configuration (see shared semantics above):

- `admin.auth.secret` — required JWT secret used by admin origin
- `admin.auth.sessions.accessTokenLifespan` (default 10 minutes)
- `admin.auth.sessions.maxRefreshTokenLifespan` (default 30 days)
- `admin.auth.sessions.idleRefreshTokenLifespan` (default 14 days)
- `admin.auth.sessions.maxSessionLifespan` (default 1 day)
- `admin.auth.sessions.idleSessionLifespan` (default 2 hours)
- Cookie options (applied to `strapi_admin_refresh`):
  - `admin.auth.cookie.domain` (or `admin.auth.domain`)
  - `admin.auth.cookie.path` (default `/admin`)
  - `admin.auth.cookie.sameSite` (default `lax`)

Key files:

- Bootstrap/config: `packages/core/admin/server/src/bootstrap.ts`
- Routes: `packages/core/admin/server/src/routes/authentication.ts`
- Controller: `packages/core/admin/server/src/controllers/authentication.ts`
- Strategy (Bearer access token validation): `packages/core/admin/server/src/strategies/admin.ts`

## Content API (users-permissions)

The users-permissions (UP) plugin supports two modes, controlled by `plugin::users-permissions.jwtManagement`:

- `legacy-support` (default): issues long‑lived `jwt` configured by `plugin::users-permissions.jwt`.
- `refresh`: uses `SessionManager` to issue short‑lived access tokens (`jwt`) and separate `refreshToken`.

When `jwtManagement` is `refresh`:

- Login/Register/Provider callback responses include `{ jwt, refreshToken }`.
- New endpoints:
  - `POST /api/auth/refresh` — body `{ refreshToken }`, returns `{ jwt }` and rotates the refresh token
  - `POST /api/auth/logout` — revokes sessions for the authenticated user; optional `{ deviceId }` in body to revoke only one device

Configuration and env keys (see shared semantics above):

- `plugin::users-permissions.jwtManagement` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_JWT_MANAGEMENT`): `'legacy-support' | 'refresh'`
- `plugin::users-permissions.sessions.accessTokenLifespan` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_ACCESS_TTL`)
- `plugin::users-permissions.sessions.maxRefreshTokenLifespan` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_MAX_REFRESH_TTL`)
- `plugin::users-permissions.sessions.idleRefreshTokenLifespan` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_IDLE_REFRESH_TTL`)

Cookie handling (refresh token storage):

- `plugin::users-permissions.sessions.httpOnly` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_HTTPONLY`): when `true`, the refresh token is always set as an httpOnly cookie and is not returned in the JSON body. When `false`, clients can opt-in per request by sending header `x-strapi-refresh-cookie: httpOnly`; otherwise the API returns `{ jwt, refreshToken }` in the response body.
- Cookie options applied to the Content API refresh cookie:
  - `plugin::users-permissions.sessions.cookie.name` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_NAME`, default `strapi_up_refresh`)
  - `plugin::users-permissions.sessions.cookie.domain` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_DOMAIN`)
  - `plugin::users-permissions.sessions.cookie.path` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_PATH`, default `/`)
  - `plugin::users-permissions.sessions.cookie.sameSite` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_SAMESITE`, default `lax`)
  - `plugin::users-permissions.sessions.cookie.secure` (env `STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_SECURE`, default `true` in production)

#### httpOnly modes and per‑request opt‑in

- If `sessions.httpOnly = true` in `plugin::users-permissions` config:

  - Login/Register/Callback/Refresh responses set the refresh token as an httpOnly cookie and do not include `refreshToken` in the JSON body.
  - JSON still includes the short‑lived access token (`jwt`).

- If `sessions.httpOnly = false` (default):
  - By default, responses include `{ jwt, refreshToken }` in JSON and do not set a cookie.
  - Clients can opt‑in to cookie mode per request by sending header `x-strapi-refresh-cookie: httpOnly`.
    - When the header is present, the server sets the refresh token cookie and omits `refreshToken` from the JSON body (returns `{ jwt }`).

Examples (assuming `jwtManagement: "refresh"`):

- Login with per‑request cookie opt‑in when `httpOnly` is false:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'x-strapi-refresh-cookie: httpOnly' \
  -d '{"identifier":"user@example.com","password":"p@ss"}' \
  http://localhost:1337/api/auth/local
# Response JSON contains { jwt } and the httpOnly cookie is set (name defaults to strapi_up_refresh)
```

- Refresh with cookie preservation/rotation (cookie mode):

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'x-strapi-refresh-cookie: httpOnly' \
  --cookie 'strapi_up_refresh=<token>' \
  http://localhost:1337/api/auth/refresh
# Returns { jwt } and rotates the refresh cookie
```

Key files:

- Plugin bootstrap/config: `packages/plugins/users-permissions/server/bootstrap/index.js`, `packages/plugins/users-permissions/server/config.js`
- Controller: `packages/plugins/users-permissions/server/controllers/auth.js`
- Routes: `packages/plugins/users-permissions/server/routes/content-api/auth.js`
- JWT service: `packages/plugins/users-permissions/server/services/jwt.js`

### Lifespan settings at a glance

All durations are expressed in seconds.

Admin (`admin.auth.sessions.*`):

| Setting                  | Units   | Typical default | Human‑readable |
| ------------------------ | ------- | --------------: | -------------- |
| accessTokenLifespan      | seconds |             600 | 10 minutes     |
| maxRefreshTokenLifespan  | seconds |         2592000 | 30 days        |
| idleRefreshTokenLifespan | seconds |         1209600 | 14 days        |
| maxSessionLifespan       | seconds |           86400 | 1 day          |
| idleSessionLifespan      | seconds |            7200 | 2 hours        |

Users & Permissions (`plugin::users-permissions.sessions.*`):

| Setting                  | Units   | Typical default | Human‑readable |
| ------------------------ | ------- | --------------: | -------------- |
| accessTokenLifespan      | seconds |             600 | 10 minutes     |
| maxRefreshTokenLifespan  | seconds |         2592000 | 30 days        |
| idleRefreshTokenLifespan | seconds |         1209600 | 14 days        |

Note on legacy fallback: `admin.auth.options.expiresIn` is deprecated. If the new Admin max settings are not provided, Strapi converts the legacy value to seconds and uses it as a fallback for both `admin.auth.sessions.maxRefreshTokenLifespan` and `admin.auth.sessions.maxSessionLifespan` (defaulting to 30 days if neither is set).

Default values source files:

- Admin defaults: `packages/core/admin/server/src/services/constants.ts`
- Users & Permissions defaults: `packages/plugins/users-permissions/server/services/constants.js`

### Examples

Admin (`config/admin.ts`):

```ts
// config/admin.ts
export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    sessions: {
      accessTokenLifespan: env.int('ADMIN_SESSIONS_ACCESS_TTL', 10 * 60), // 10 minutes
      maxRefreshTokenLifespan: env.int('ADMIN_SESSIONS_MAX_REFRESH_TTL', 30 * 24 * 60 * 60), // 30 days
      idleRefreshTokenLifespan: env.int('ADMIN_SESSIONS_IDLE_REFRESH_TTL', 14 * 24 * 60 * 60), // 14 days
      maxSessionLifespan: env.int('ADMIN_SESSIONS_MAX_SESSION_TTL', 1 * 24 * 60 * 60), // 1 day
      idleSessionLifespan: env.int('ADMIN_SESSIONS_IDLE_SESSION_TTL', 2 * 60 * 60), // 2 hours
    },
    cookie: {
      domain: env('ADMIN_AUTH_COOKIE_DOMAIN'),
      path: env('ADMIN_AUTH_COOKIE_PATH', '/admin'),
      sameSite: env('ADMIN_AUTH_COOKIE_SAMESITE', 'lax'),
    },
  },
});
```

Users & Permissions (`config/plugins.ts`):

```ts
// config/plugins.ts
export default ({ env }) => ({
  'users-permissions': {
    jwtSecret: env('JWT_SECRET'),
    jwtManagement: env('STRAPI_PLUGINS_USERS_PERMISSIONS_JWT_MANAGEMENT', 'legacy-support'), // or 'refresh'
    sessions: {
      accessTokenLifespan: env.int('STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_ACCESS_TTL', 10 * 60), // 10 minutes
      maxRefreshTokenLifespan: env.int(
        'STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_MAX_REFRESH_TTL',
        30 * 24 * 60 * 60
      ), // 30 days
      idleRefreshTokenLifespan: env.int(
        'STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_IDLE_REFRESH_TTL',
        14 * 24 * 60 * 60
      ), // 14 days
      maxSessionLifespan: env.int(
        'STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_MAX_SESSION_TTL',
        1 * 24 * 60 * 60
      ), // 1 day
      idleSessionLifespan: env.int(
        'STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_IDLE_SESSION_TTL',
        2 * 60 * 60
      ), // 2 hours
      httpOnly: env.bool('STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_HTTPONLY', false),
      cookie: {
        name: env('STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_NAME', 'strapi_up_refresh'),
        sameSite: env('STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_SAMESITE', 'lax'),
        path: env('STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_PATH', '/'),
        domain: env('STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_DOMAIN'),
        secure: env.bool(
          'STRAPI_PLUGINS_USERS_PERMISSIONS_SESSIONS_COOKIE_SECURE',
          process.env.NODE_ENV === 'production'
        ),
      },
    },
  },
});
```

## Notes

- Access tokens are always used in the `Authorization` header as `Bearer <token>`.
- Admin refresh tokens are stored in an httpOnly cookie and are not exposed to JavaScript.
- Device-bound sessions allow targeted logout by `deviceId`.
