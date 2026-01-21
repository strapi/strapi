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

Each origin stores session rows in `admin::session` (hidden content-type) using the table/collection `strapi_sessions`, containing `userId`, `sessionId`, `deviceId`, `origin`, `expiresAt`, `absoluteExpiresAt`, `status`, `type`.

### Public API (per origin)

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

Configuration:

- `admin.auth.secret` — JWT secret for symmetric algorithms (HS256, HS384, HS512)
- `admin.auth.sessions.options.algorithm` — JWT algorithm (default: 'HS256')
- `admin.auth.sessions.options.privateKey` — Private key for asymmetric algorithms (RS256, RS512, ES256, etc.)
- `admin.auth.sessions.options.publicKey` — Public key for asymmetric algorithms (RS256, RS512, ES256, etc.)
- `admin.auth.sessions.options.*` — Any other JWT options (issuer, audience, subject, etc.)
- `admin.auth.sessions.accessTokenLifespan` (default 1800)
- `admin.auth.sessions.maxRefreshTokenLifespan` (default 30 days)
- `admin.auth.sessions.idleRefreshTokenLifespan` (default 14 days)
- `admin.auth.sessions.maxSessionLifespan` (default 1 day)
- `admin.auth.sessions.idleSessionLifespan` (default 2 hours)

**Deprecated:**

- `admin.auth.options.*` — Use `admin.auth.sessions.options.*` instead
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

Configuration keys:

- `plugin::users-permissions.jwtManagement`: `'legacy-support' | 'refresh'`
- `plugin::users-permissions.sessions.accessTokenLifespan`
- `plugin::users-permissions.sessions.maxRefreshTokenLifespan`
- `plugin::users-permissions.sessions.idleRefreshTokenLifespan`
  - `plugin::users-permissions.sessions.maxSessionLifespan`
  - `plugin::users-permissions.sessions.idleSessionLifespan`

Key files:

- Plugin bootstrap/config: `packages/plugins/users-permissions/server/bootstrap/index.js`, `packages/plugins/users-permissions/server/config.js`
- Controller: `packages/plugins/users-permissions/server/controllers/auth.js`
- Routes: `packages/plugins/users-permissions/server/routes/content-api/auth.js`
- JWT service: `packages/plugins/users-permissions/server/services/jwt.js`

## Session Revocation on Credential Changes

For security, **password changes and resets automatically invalidate all active refresh/session tokens** across all devices:

- **Admin**: When an admin user changes their password via `PUT /admin/users/me` (with `currentPassword` and `password`), all admin sessions are revoked, including the current session. The user must re-authenticate.
- **Admin**: When an admin resets their password via `POST /admin/reset-password`, all existing admin sessions are revoked before issuing a new session.
- **Content API (refresh mode)**: When a user changes their password via `POST /api/auth/change-password` or resets it via `POST /api/auth/reset-password`, all users-permissions sessions are revoked. A new refresh token is issued for the current request.

This behavior ensures that compromised refresh tokens cannot be used after a password change, mitigating persistent session hijacking attacks.

## Notes

- Access tokens are always used in the `Authorization` header as `Bearer <token>`.
- Admin refresh tokens are stored in an httpOnly cookie and are not exposed to JavaScript.
- Device-bound sessions allow targeted logout by `deviceId`.
