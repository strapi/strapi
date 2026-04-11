# Disable `register-admin` via `admin.register.enabled`

**Date:** 2026-04-11
**Status:** Draft
**Related:** [`2026-04-11-disable-register-admin-config-key-variants.md`](./2026-04-11-disable-register-admin-config-key-variants.md)

## Problem

A fresh Strapi installation exposes `POST /admin/register-admin` publicly.
Until the first super admin is created, anyone who can reach the admin URL
may claim the super-admin slot on a first-come-first-served basis. Operators
hardening a deployment have no built-in way to forbid this flow and force
first-admin provisioning through the existing
`strapi admin:create-user` CLI.

This spec adds a single configuration key, `admin.register.enabled`, that
when set to `false` disables the self-registration flow — both the HTTP
endpoint and the matching frontend route — without touching the invited-user
registration (`/admin/register`) flow.

## Goals

- Allow operators to disable the public "first admin" self-registration path
  via a single config boolean.
- Preserve full backwards compatibility: existing installs that do not set
  the key see no change.
- Keep the invited-user registration flow (`POST /admin/register` with a
  server-issued `registrationToken`) fully functional.
- Keep the surface area minimal and localized so the final key name can be
  renamed late (see the variants doc).

## Non-goals

- Gating SSO auto-registration (`admin.auth.autoRegistration`). That is a
  separate feature and stays untouched.
- Gating the invited-user `/register` flow.
- Adding a dedicated "registration disabled" UI screen.
- Surfacing an inline hint on the login page for fresh installs that hit
  this flag. Operators who disable it are expected to know about the
  `strapi admin:create-user` CLI.
- Documentation updates at
  `docs.strapi.io/cms/configurations/admin-panel` — out of scope for this
  repo. Release notes will mention the new key.

## Configuration

### Key

`admin.register.enabled` — boolean, default `true`.

Read via `strapi.config.get('admin.register.enabled', true)` at every call
site. Operators set it in `config/admin.{ts,js}`:

```ts
export default ({ env }) => ({
  register: {
    enabled: env.bool('ADMIN_REGISTER_ENABLED', true),
  },
  // ...other existing admin config
});
```

The env var `ADMIN_REGISTER_ENABLED` is a suggestion, not a built-in
binding. Strapi's convention is for operators to wire env vars explicitly
in config files.

### Naming note

The working name `admin.register.enabled` is intentionally provisional.
All naming alternatives and the rationale for each are captured in
[`2026-04-11-disable-register-admin-config-key-variants.md`](./2026-04-11-disable-register-admin-config-key-variants.md).
The implementation keeps the config read localized so a final rename is a
mechanical find-and-replace across a small surface area.

## Backend changes

### 1. `registerAdmin` controller guard

File: `packages/core/admin/server/src/controllers/authentication.ts`

At the top of `registerAdmin`, before `validateAdminRegistrationInput`, add a
config check:

```ts
const registerEnabled = strapi.config.get('admin.register.enabled', true);
if (!registerEnabled) {
  throw new ApplicationError('Admin registration is disabled');
}
```

Guard ordering (important for information disclosure):

1. `admin.register.enabled === false` → `ApplicationError('Admin registration is disabled')` (HTTP 400).
2. `hasAdmin === true` → `ApplicationError('You cannot register a new super admin')` (existing behavior, HTTP 400).
3. Otherwise, create the first super admin (existing behavior).

Running the disabled check first means a probe cannot use this endpoint to
determine whether an admin exists when the flag is off — they always get the
"disabled" message.

`ApplicationError` was chosen over `ForbiddenError` to match the existing
guard at line 185 of the same controller and keep HTTP semantics uniform
across the two failure modes.

### 2. `/admin/init` response

File: `packages/core/admin/server/src/controllers/admin.ts`

Extend the `init` controller to include the flag in its response so the
frontend can branch without a second round-trip:

```ts
return {
  data: {
    uuid,
    hasAdmin,
    menuLogo: menuLogo ? menuLogo.url : null,
    authLogo: authLogo ? authLogo.url : null,
    registerEnabled: strapi.config.get('admin.register.enabled', true),
  },
} satisfies Init.Response;
```

### 3. `Init.Response` contract

File: `packages/core/admin/shared/contracts/admin.ts`

Add `registerEnabled: boolean` to the `Init.Response['data']` shape. This is
an additive change — existing clients that do not read the field are
unaffected.

### 4. Routes

File: `packages/core/admin/server/src/routes/authentication.ts`

**No changes.** The guard lives in the controller because (a) the existing
"already has admin" guard lives there, keeping all registration-disabled
logic colocated, and (b) avoiding a route-level middleware keeps the check
straightforward and easy to test.

### 5. Backend tests

- `packages/core/admin/server/src/controllers/__tests__/authentication.test.ts`
  (create or extend): assert `registerAdmin` throws `ApplicationError` when
  `admin.register.enabled` is `false`, and that the existing happy path /
  `hasAdmin`-true path are unchanged when the flag is `true` or unset.
- `packages/core/admin/server/src/controllers/__tests__/admin.test.ts`
  (existing, line 4): extend the `init` test to assert `registerEnabled` is
  present and reflects the config.

## Frontend changes

### 1. `AuthPage` routing logic

File: `packages/core/admin/admin/src/pages/Auth/AuthPage.tsx`

Current logic (lines 58–74) force-redirects `/auth/login` →
`/auth/register-admin` whenever `!hasAdmin`. This must be gated on
`registerEnabled`, and direct navigation to `/auth/register-admin` must also
redirect to login when disabled.

Revised section:

```ts
const { hasAdmin, registerEnabled = true } = data ?? {};

// If register-admin is the requested page but registration is disabled,
// send the user to login regardless of whether an admin exists.
if (authType === 'register-admin' && !registerEnabled) {
  return <Navigate to="/auth/login" />;
}

// there is already an admin user
if (hasAdmin && authType === 'register-admin' && token) {
  return <Navigate to="/" />;
}

// Redirect the user to the register-admin if it is the first user
// AND self-registration is enabled. Otherwise leave them on login.
if (!hasAdmin && authType !== 'register-admin' && registerEnabled) {
  return (
    <Navigate
      to={{
        pathname: '/auth/register-admin',
        search,
      }}
    />
  );
}
```

Two behavioral changes:

1. Direct navigation to `/auth/register-admin` while disabled → redirect to
   `/auth/login`. This covers bookmarks and typed URLs. The `?redirectTo=`
   forwarding dance is not needed because there's nothing for the user to
   complete on a disabled screen.
2. The auto-redirect "no admin → go register" only fires when
   `registerEnabled` is true. When disabled + no admin, the user stays on
   whatever auth page they requested (typically `/auth/login`).

The `registerEnabled = true` default in the destructure guards against older
server responses that don't include the field (e.g. partial upgrades) so a
client talking to a pre-flag server behaves identically to today.

### 2. Router

File: `packages/core/admin/admin/src/router.tsx`

**No changes.** The `/auth/:authType` route stays in place and `AuthPage`
handles all branching internally. Removing or gating the route at the
router level would require pulling `useInitQuery` data into a router-level
guard, which is more complex than the single `if` above.

### 3. Frontend tests

File: `packages/core/admin/admin/src/pages/Auth/tests/AuthPage.test.tsx`
(extend or create).

Cover four cases:

1. `registerEnabled: true, hasAdmin: false` → visiting `/auth/login`
   redirects to `/auth/register-admin` (existing behavior, preserved).
2. `registerEnabled: false, hasAdmin: false` → visiting `/auth/login` stays
   on `/auth/login` (no redirect loop).
3. `registerEnabled: false, hasAdmin: false` → direct visit to
   `/auth/register-admin` redirects to `/auth/login`.
4. `registerEnabled: false, hasAdmin: true` → direct visit to
   `/auth/register-admin` redirects to `/auth/login`.

## Edge cases

### Fresh install with `admin.register.enabled: false` and no admin yet

The operator has disabled self-registration but has not yet created the
first admin via the CLI. Expected flow:

1. User navigates to the admin URL.
2. Frontend calls `/admin/init`, receives `hasAdmin: false`,
   `registerEnabled: false`.
3. Any path auto-redirect is skipped. The user lands on `/auth/login`.
4. If the user submits credentials, Strapi's existing login flow returns an
   error because no user exists. No new error message, no hint.
5. Operator is expected to know that `strapi admin:create-user` is the way
   forward. This is documented in release notes.

### Existing installs with a super admin already provisioned

Nothing changes. The `hasAdmin` guard in `registerAdmin` was already
rejecting second registrations; the new guard sits in front of it. Login,
invited-user register, forgot-password, and SSO all behave identically.

### SSO auto-registration

`admin.auth.autoRegistration` (EE) is a separate feature that provisions
non-super-admin users on successful SSO login. It is **not** gated by
`admin.register.enabled`. If the Strapi team later wants a combined
"no external user creation at all" mode, they can extend this flag — see
the variants doc for discussion.

### Telemetry

The existing `didCreateFirstAdmin` event fires at the end of `registerAdmin`
(line 203 of the controller). When disabled, that line is unreachable,
which is correct: no first admin was created via this path.

## Rollout

- Single PR containing backend changes, frontend changes, and tests.
- No feature flag on top of the feature flag — the config key itself is the
  opt-in.
- Changelog / release notes mention the new key and point at
  `strapi admin:create-user` as the recommended way to provision the first
  admin when the flag is disabled.

## Open questions

- Final name of the config key. Pending consultation with the Strapi team
  against the variants doc. Implementation ships with
  `admin.register.enabled`; renaming is a mechanical find-and-replace.
