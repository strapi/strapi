---
title: Admin 2FA enforcement
description: 'How the admin panel requires two-factor authentication: enforcement modes, grace periods, locks, and the security-settings endpoint.'
---

Enrolment on its own is opt-in. Enforcement is the policy that makes it mandatory, runs a grace
period, and locks accounts that let the grace period expire. Read
[Admin two-factor authentication](./01-admin-two-factor.md) first.

## Modes

Policy lives in `core_store` under the admin store key `security-settings`, **not** in
`config/admin.ts`: it is an organisation decision an administrator makes in the UI, not a
deployment setting.

| Mode                 | Who must enrol                                     |
| -------------------- | -------------------------------------------------- |
| `off`                | Nobody. No grace runs, existing locks stay dormant |
| `optional` (default) | Members of roles flagged `mfaRequired`             |
| `required`           | Everyone with a local password                     |

`graceDays` (integer 1..30, default 7) is how long a required user has between their first session
and the lock.

The stored document holds `{ mfa: { mode, graceDays }, trustedDevices, passkeys }`. The per-role
flag is **not** in it: `requiredRoles` is read from and written to `admin::role.mfaRequired`, and
the endpoint presents both together.

Anything unreadable in the stored document falls back to the default with a warning rather than
failing the request, the same rule the config validator uses.

## Exemptions

`isExemptFromMfa` is the single place this is decided, and enforcement, the guard, and the refresh
path all go through it. An account is exempt when:

1. **It has no local password.** An SSO-only administrator has no password to pair a second factor
   with, so there is nothing to enforce.
2. **EE SSO is enabled and one of the user's roles is in `ssoLockedRoles`.** Those users are
   already blocked from local login.

The `ssoLockedRoles` comparison intentionally mirrors EE's own (`ee/server/src/utils/sso-lock.ts`),
including leaving the configured id uncoerced: a numeric entry that EE's strict equality fails to
match must also fail to match here. Making this exemption broader than the local-login block EE
actually enforces would exempt a password-holding user from MFA they should be subject to.

## The grace and lock lifecycle

`enforce(user)` runs on **every path that mints a session** for a password-holding user (login,
register, register-admin, reset-password) and again on the refresh path
(`controllers/authentication.ts:59` and `:490`). Outcomes:

| Outcome   | When                                                 | Effect                                                                    |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `none`    | Feature off, mode `off`, exempt, or already enrolled | Session issued normally                                                   |
| `grace`   | Required, not enrolled, deadline in the future       | Session issued, carrying `mfaEnrolmentRequired: true` and `mfaGraceUntil` |
| `refused` | Locked, or the grace deadline has passed             | `MfaLockedError` (403), after emitting `admin.auth.error`                 |

The first session of a required, unenrolled user stamps `mfaGraceUntil`. Once that deadline passes,
the next session attempt sets `mfaLockedAt`, **invalidates every session for the account**, records
a `locked` event and sends the notification mail, then refuses.

Both stamps are written as **conditional single UPDATEs whose affected-row count is the decision**,
never read-then-write. A read-then-write would let a refresh-path lock race an administrator's
unlock and silently win. When a precondition turns out to be gone (an unlock landed in between),
the evaluation re-reads the row exactly once and then decides on what it says.

When a user stops being required (the mode dropped, a role flag cleared), both stamps are cleared
on their next session so a stale lock cannot outlive the policy that created it.

Sessions are invalidated through `strapi.sessionManager('admin')`. If the admin origin is not
registered, the lock and its event still land and a warning is logged, rather than the lock
silently failing.

## Unlocking

```
POST /admin/mfa/users/:id/unlock     # requires admin::users.update
```

204 on success, 404 for an unknown user, 400 when the account is not locked. It clears both the
lock and the grace stamp; no new grace is written, so the user's next session starts a fresh
window.

From the CLI, for when nobody can get in:

```bash
strapi admin:unlock-user-mfa -e user@example.com
```

An unlock does not touch the second factor, and `admin:reset-user-mfa` does not lift a lock. The
two are deliberately separate operations.

## The security-settings endpoint

```
GET  /admin/security-settings    # admin::security-settings.read
PUT  /admin/security-settings    # admin::security-settings.update
```

Both actions are registered in `server/src/config/admin-actions.ts` under the `security`
category, so they appear in the RBAC matrix like any other settings permission.

`PUT` semantics: **per object, no merge inside an object.** Each of `mfa`, `trustedDevices` and
`passkeys` present in the body replaces its object whole; an absent one is left untouched; a body
with none of the three is rejected. The stored document is always rewritten whole from the resolved
values, so an absent object is re-written unchanged rather than dropped.

### The self-lockout guard

The one write that sets policy may not require a second factor of a caller who does not have one.
A caller who is neither exempt nor enrolled is refused when the save either raises the mode to
`required` or adds a role they themselves hold to `requiredRoles`. Without this, an administrator
could lock themselves out with a single save.

### Downgrades need re-authentication

Session authority alone is not enough when the session may be the thing an attacker holds, so any
save that **relaxes** protection requires the current password (and a code, when the caller is
enrolled), exactly like `/mfa/disable`. The relaxing changes are:

- A lower `mode`
- A role removed from `requiredRoles`, **while the resulting mode is not `required`**. Once mode
  alone covers every local-password user the per-role list is inert, so removing a role on the same
  save that raises to `required` is not a downgrade
- A longer `graceDays`
- Enabling trusted devices, or a longer trust `days` while enabled
- Disabling passkeys, which deletes every registered passkey in the same transaction

Raising protection needs nothing extra.

Two exemption rules apply to a **password-less** (SSO-only) caller:

- For lowering enforcement or widening trust, they are refused with an explicit message telling
  them to ask an administrator who signs in with a password
- For a save whose **only** triggering term is disabling passkeys, they proceed on session
  authority. In an SSO-only organisation every administrator is password-less, so the strict rule
  would make the setting permanently unreachable. Combined with either of the other terms it is
  refused as normal

The admin panel mirrors this predicate exactly rather than approximating it
(`pages/Settings/pages/Security/utils/isSecurityDowngrade.ts`), so the UI never demands a
credential the server would not have asked for, and never routes a password-less administrator into
a dialog they cannot complete.

## What the UI shows

- **Settings > Security** (`pages/Settings/pages/Security/SecurityPage.tsx`): one card per policy
  object, saving through `useSecuritySettingsSave`, which routes any downgrade through
  `ConfirmDowngradeDialog`
- **Settings > Users**, per user (`pages/Settings/pages/Users/components/TwoFactorPanel.tsx`):
  enrolment state, lock state and the unlock action, plus trusted-device and passkey counts
- **A grace banner** (`components/MfaGraceBanner.tsx`) for a user inside their grace period

`GET /admin/users/:id` exposes `mfaLockedAt` (see `controllers/user.ts`) so the users list can show
lock state without a second call.

## Key files

- Service: `packages/core/admin/server/src/services/security-settings.ts` (policy read/write, the
  guard, the downgrade gate) and `services/mfa.ts` (`isExemptFromMfa`, `isMfaRequiredFor`,
  `enforce`, `unlock`)
- Error: `packages/core/admin/server/src/services/mfa-errors.ts`
- Routes: `packages/core/admin/server/src/routes/security-settings.ts`
- Actions: `packages/core/admin/server/src/config/admin-actions.ts`
- Contracts: `packages/core/admin/shared/contracts/security-settings.ts`
- Tests: `tests/api/core/admin/admin-mfa-enforcement.test.api.ts`,
  `tests/e2e/tests/admin/mfa-enforcement.spec.ts`
