# Agent 8 — OAuth stack removal (`grant` / `purest` / `jwk-to-pem`)

**Status:** Draft PR ready — `chore/remove-oauth-unmaintained-deps`  
**Verdict:** **Proceed** — internal rewrite; admin OAuth config surface unchanged.

---

## 1. Can users configure `grant` / `purest` / `jwk-to-pem` directly?

**No direct library configuration.** Users only interact through **Settings → Users & Permissions → Providers** (admin UI) or the admin REST endpoints (`GET/PUT /users-permissions/providers`).

| Library          | User-facing? | How config flows                                                                                                                                                                                                                               |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`grant`**      | Indirect     | Admin fields (`enabled`, `key`, `secret`, `callback`, `subdomain`, `jwksurl`, `scope`) are persisted in the plugin store under key `grant` and fed into the OAuth connect handler. Users never import or configure `grant` options explicitly. |
| **`purest`**     | No           | Used only inside `providers-registry.js` `authCallback` functions to fetch provider profile data after token exchange.                                                                                                                         |
| **`jwk-to-pem`** | No           | Used only on the Cognito path to verify `id_token` against JWKS.                                                                                                                                                                               |

**Passthrough nuance:** `auth.connect` previously spread the entire stored `grant` blob into `grant()`. In practice the admin UI and bootstrap only populate the fields above. Extra keys could exist if someone manually edited the plugin store — those would have been passed through to `grant` but were never documented.

**Dynamic callback:** Users/frontends can pass `?callback=` on `/api/connect/:provider` (validated against configured callback origin/path). This is preserved in the replacement middleware via `ctx.state.oauthConnect`.

---

## 2. Configuration model (internal only → safe to replace)

```
Admin UI / PUT /users-permissions/providers
        ↓
plugin store key "grant"  (per-provider: enabled, key, secret, callback, …)
        ↓
auth.connect  →  OAuth authorize + token exchange  →  redirect to frontend callback with tokens
        ↓
GET /api/auth/:provider/callback  →  providers-registry.authCallback  →  JWT + user
```

Bootstrap (`server/bootstrap/index.js`) seeds default `grantConfig` from `providers-registry` and merges with existing store values — unchanged.

---

## 3. Breaking risks identified

| Risk                                                               | Severity   | Mitigation in PR                                                                                                                                                                       |
| ------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **17 built-in providers** — OAuth2 + Twitter OAuth1 + Cognito OIDC | Medium     | Inlined grant oauth endpoint map; fetch-based token exchange; OAuth1 HMAC-SHA1 for Twitter; `crypto.createPublicKey({ format: 'jwk' })` for Cognito                                    |
| **Dynamic `?callback=` override**                                  | Low        | Preserved with same validator (`plugin::users-permissions.callback.validate`)                                                                                                          |
| **`providers-registry.add()` extension**                           | Low–Medium | Public service method exists; `authCallback` no longer receives `purest`. Custom providers must use `fetch`/`provider-http` helpers. No monorepo usages; undocumented extension point. |
| **Undocumented extra keys in plugin store**                        | Very low   | Replacement only reads known fields; extra keys ignored (same effective behavior for documented fields)                                                                                |
| **No OAuth E2E/API coverage today**                                | Medium     | Added unit tests for oauth-connect helpers; existing auth API tests cover local auth only. **Manual OAuth smoke recommended before merge.**                                            |

**Not aborting:** No unresolvable user-facing breaking changes for standard Strapi OAuth usage (admin provider settings + social login flows).

---

## 4. Implementation (draft PR)

### Removed dependencies

- `grant@5.4.24`
- `purest@4.0.2`
- `jwk-to-pem@2.0.7`

### Added modules

| File                                   | Replaces                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `server/utils/oauth-connect/`          | `grant.koa()` — authorize redirect, callback token exchange, frontend redirect |
| `server/utils/verify-jwt-with-jwks.js` | `jwk-to-pem` — Cognito JWT verification                                        |
| `server/utils/provider-http.js`        | `purest` — profile HTTP via `fetch`                                            |

### Modified

- `server/controllers/auth.js` — `connect` uses `createOAuthConnectMiddleware()`
- `server/services/providers-registry.js` — fetch-based profile fetchers for all 17 providers

### Tests run

| Suite                                                                | Result                                                                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `packages/plugins/users-permissions` unit tests (8 suites, 90 tests) | **Pass**                                                                                                                         |
| `tests/api/plugins/users-permissions` API tests                      | **Blocked locally** — Jest Haste duplicate `@strapi/core` from test-apps `.yalc` (pre-existing env issue, not caused by this PR) |

---

## 5. Pre-merge checklist

- [ ] Manual smoke: Google + GitHub OAuth2 connect/callback/login
- [ ] Manual smoke: Cognito (id_token + JWKS) if used in production
- [ ] Manual smoke: Twitter OAuth1 (legacy provider)
- [ ] Re-run `tests/api/plugins/users-permissions` in CI (clean env)
- [ ] Fresh-app `npm audit` — confirm `uuid@8`, `elliptic` chains removed from users-permissions

---

## 6. PR

- **Branch:** `chore/remove-oauth-unmaintained-deps`
- **Title:** `refactor(users-permissions): replace grant/purest/jwk-to-pem with fetch and crypto`
- **Target:** `develop`

Clears audit paths: `uuid@8` (via grant/purest → request-oauth), `elliptic` (via jwk-to-pem), deprecated unmaintained OAuth stack.
