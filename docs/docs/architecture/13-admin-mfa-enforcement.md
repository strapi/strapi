---
title: Admin 2FA enforcement
description: 'How the admin panel requires two-factor authentication: enforcement modes, grace periods, locks, and the security-settings endpoint.'
status: needs-review
review_notes:
  - Corrected on 2026-10-16 after a code review (lock mail, refresh status, line anchors, users list, the save path). The rest of the page has not been re-verified claim by claim.
---

Enrolment on its own is opt-in. Enforcement is the policy that makes it mandatory, runs a grace
period, and locks accounts that let the grace period expire. Read
[Admin two-factor authentication](./12-admin-two-factor.md) first.

## Modes

Policy lives in `core_store` under the admin store key `security-settings`, **not** in
`config/admin.ts`: it is an organisation decision an administrator makes in the UI, not a
deployment setting.

| Mode            | Who must enrol                                     |
| --------------- | -------------------------------------------------- |
| `off` (default) | Nobody. No grace runs, existing locks stay dormant |
| `optional`      | Members of roles flagged `mfaRequired`             |
| `required`      | Everyone with a local password                     |

`graceDays` (integer 1..30, default 7) is how long a required user has between their first session
and the lock.

The stored document holds `{ mfa: { mode, graceDays }, trustedDevices, passkeys }`. The per-role
flag is **not** in it: `requiredRoles` is read from and written to `admin::role.mfaRequired`, and
the endpoint presents both together.

`optional` with no role flagged requires nobody, so `GET` reports it as `off` rather than as a
configured state with nothing selected. This is normalised on read only (`getSettings`): the
stored mode is left alone, and enforcement, which reads the stored mode, decides exactly as before.
Installs that stored the former `optional` default therefore read as `off` with no migration.

While the mode is `off`, role flags are kept so a later raise can bring them back, but they require
nobody. The guard and the downgrade gate below treat them that way: turning one back on counts as
adding it, and dropping one relaxes nothing.

Anything unreadable in the stored document falls back to the default with a warning rather than
failing the request, the same rule the config validator uses.

## Exemptions

EE SSO logins bypass the second factor entirely, by design: the identity provider owns that
account's second factor. The SSO callback (`redirectWithAuth`) calls no `enforce`, and it marks the
session with `authMethod: 'sso'` in its metadata, which every rotation carries over. The refresh
path reads that mark and skips `enforce` for the whole login, so an SSO login is never locked or
put on a grace clock by a later refresh either. The rules below decide who enforcement applies to
among accounts that do sign in with a password.

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
register, register-admin, reset-password) and again on the refresh path (`enforce` calls in
`controllers/authentication.ts`). Outcomes:

| Outcome   | When                                                 | Effect                                                                             |
| --------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `none`    | Feature off, mode `off`, exempt, or already enrolled | Session issued normally                                                            |
| `grace`   | Required, not enrolled, deadline in the future       | Session issued, carrying `mfaEnrolmentRequired: true` and `mfaGraceUntil`          |
| `refused` | Locked, or the grace deadline has passed             | `MfaLockedError` (403), after emitting `admin.auth.error` with reason `mfa_locked` |

On the refresh path a refusal is not an error page: the refresh answers 401 `Invalid refresh
token`, the cookie is cleared, and the user lands on the login screen, where the next attempt
gets the 403. The refresh validates the token, enforces, and only then rotates. So a refused user
never spends the token, and an enforcement error (a 500) leaves the presented token valid for the
retry instead of signing the browser out.

The first session of a required, unenrolled user stamps `mfaGraceUntil`. Once that deadline passes,
the next session attempt sets `mfaLockedAt`, **invalidates every session for the account**, records
a `locked` event and emits `admin.mfa.locked`, then refuses. A lock is **not** emailed: the
user learns of it at the login screen, and the audit log carries it.

Both stamps are written as **conditional single UPDATEs whose affected-row count is the decision**,
never read-then-write. A read-then-write would let a refresh-path lock race an administrator's
unlock and silently win. When a precondition turns out to be gone (an unlock landed in between),
the evaluation re-reads the row exactly once and then decides on what it says.

When a user stops being required (the mode dropped, a role flag cleared), both stamps are cleared
on their next session so a stale lock cannot outlive the policy that created it.

Grace clocks keep running while the mode is `off`. So that resuming enforcement after a pause
longer than `graceDays` does not lock every previously graced user at their next session, a save
that moves the mode from `off` to anything else clears `mfaGraceUntil` on every unlocked account,
in the same transaction. Each user gets a fresh window and a banner.

The same applies to any account a change makes **newly required**, because its stamp may be left
from an earlier requirement whose clock kept running:

- A settings save (`restartStaleGrace` in `services/security-settings.ts`) clears the stamp of every
  unlocked account it newly requires: everyone when raising `optional` to `required` who held no
  enforced role, and under `optional` the holders of an added role who held no enforced role
  before. Accounts already required keep their running deadline.
- A role change on a user (`updateById` in `services/user.ts`) calls `clearGraceIfStale` with the row
  as it was. If the account was not required before the change, its stamp is stale and is cleared.
- The future flag and `admin.auth.mfa.enabled` need a restart to change. `syncFeatureState` runs at
  every boot and keeps `mfa-feature-state` in the admin `core_store`. The first boot with the
  feature on after a boot with it off (or with no marker yet) clears every unlocked grace stamp.

Locks are never cleared by any of these. Only an unlock does that.

Sessions are invalidated through `strapi.sessionManager('admin')`. If the admin origin is not
registered, the lock and its event still land and a warning is logged, rather than the lock
silently failing.

## Acting on another user's factor

Unlocking, resetting and removing another user's passkeys each lower that user's protection, so
all three routes share one gate (`authorizeActionOnUser` in `controllers/mfa.ts`), applied after
the target is found and before anything is spent:

- **Only a super admin may do it to a super admin**, or `admin::users.update` alone would let a
  lesser administrator strip a super admin's factor and hand that account a fresh, password-only
  grace window. Otherwise 403 with code `MFA_SUPER_ADMIN_TARGET`, before any credential is checked.
- **The acting administrator re-authenticates** (`assertActorReauth` in `services/mfa.ts`), with
  their own `password` and `code` in the body: the password, plus a TOTP or recovery code when they
  have a second factor. An administrator with no local password (SSO only) has nothing to present
  and acts on session authority, as for the passkeys toggle. A missing credential is 400 with code
  `MFA_REAUTH_REQUIRED`. A wrong password charges no throttle; a wrong code charges both tiers.

The three routes carry `admin::rateLimit`, keyed per account and route pattern. In the panel,
`TwoFactorPanel` collects what `/mfa/me` says the viewer owes through `ConfirmDowngradeDialog`.
The CLI commands need none of this: whoever runs them already has the server.

## Unlocking

```
POST /admin/mfa/users/:id/unlock     # requires admin::users.update, body { password?, code? }
```

204 on success, 404 for an unknown user, 400 when the account is not locked. It clears both the
lock and the grace stamp; no new grace is written, so the user's next session starts a fresh
window.

From the CLI, for when nobody can get in:

```bash
strapi admin:unlock-user-mfa -e user@example.com
```

An unlock does not touch the second factor, and a reset does not lift a lock. The two are
deliberately separate operations.

## Resetting another user's factor

```
POST /admin/mfa/users/:id/reset      # requires admin::users.update, body { password?, code? }
```

Strips the account's second factor entirely (authenticator, recovery codes, passkeys and
trusted devices) and invalidates every session for it. 204 on success, 404 for an unknown user,
and 204 (not 400) for an account that was never enrolled: the caller's intent is "this account
must end up with no second factor", which an unenrolled account already satisfies.

This is the way back for a user who still knows their password but has lost their authenticator
and spent their recovery codes. There is no lock to clear in that situation, so unlocking does
not help. Sessions are evicted before the audit event is written, so a failing event write cannot
leave an attacker's session alive past a reset done because the account was suspected
compromised.

`admin:reset-user-mfa` on the CLI calls the same service method, for when nobody can sign in at
all.

The route refuses the caller's own id with 400. Resetting yourself goes through
`/mfa/disable`, which asks for your password and a code.

## The security-settings endpoint

```
GET  /admin/security-settings              # admin::security-settings.read
PUT  /admin/security-settings              # admin::security-settings.update
GET  /admin/security-settings/mfa-impact   # admin::security-settings.read
```

Both actions are defined in `server/src/config/admin-actions.ts` under the `security` category.
`bootstrap.ts` registers them only while the future flag is on, so with the flag off they never
appear in the RBAC matrix for a page that does not exist.

`PUT` is behind `admin::rateLimit` like the other credential routes, and every save records
`admin.security-settings.update` in the EE audit log with the changed fields.

`mfa-impact?mode=&requiredRoles[]=` answers `{ affected, enrolled }` for a proposed policy:
how many accounts it would newly require, and how many of those are already enrolled. Accounts the
stored settings already require are not counted, so requiring a role with no users while another
role is required reports zero rather than that other role's users. The UI calls it
before any save that raises enforcement and shows the count in a confirmation dialog, so a
`required` save that starts a grace clock for 300 people is never a single click.

`PUT` semantics: **per object, no merge inside an object.** Each of `mfa`, `trustedDevices` and
`passkeys` present in the body replaces its object whole; an absent one is left untouched; a body
with none of the three is rejected. The stored document is always rewritten whole, inside the
transaction, from a fresh read, so an absent object is re-written as it stands now rather than as
it stood when the request began. A role id in `requiredRoles` that does not exist is refused
(`UNKNOWN_ROLE`).

### The self-lockout guard

The one write that sets policy may not require a second factor of a caller who does not have one.
A caller who is neither exempt nor enrolled is refused when the save either raises the mode to
`required` or, with the resulting mode `optional`, adds a role they themselves hold to
`requiredRoles` (a flag kept under `off` counts as added). Without this, an administrator
could lock themselves out with a single save. The refusal carries code `ENROL_FIRST`, and the UI
shows a link to the profile page before the save is attempted.

### No raise without an encryption key

TOTP secrets are stored encrypted, so without `admin.secrets.encryptionKey` (usually
`ENCRYPTION_KEY`) nobody can enrol. Requiring a factor then only starts every affected user's
clock towards a lock. So any save that puts someone newly on the clock (a raise to `required`, or
an added role under `optional`) is refused with code `NO_ENCRYPTION_KEY` while
`canEncryptSecrets()` is false. Lowering enforcement still works. Bootstrap also logs an error when
the feature is on and the key is missing.

### Downgrades need re-authentication

Session authority alone is not enough when the session may be the thing an attacker holds, so any
save that **relaxes** protection requires the current password (and a code, when the caller is
enrolled), exactly like `/mfa/disable`. The relaxing changes are:

- A lower `mode`
- A role removed from `requiredRoles`, **while the resulting mode is not `required`** and the
  previous mode was not `off`. Once mode alone covers every local-password user the per-role list
  is inert, so removing a role on the same save that raises to `required` is not a downgrade, and
  under `off` the flags required nobody to begin with
- A longer `graceDays`
- Enabling trusted devices, or a longer trust `days` while enabled
- Disabling passkeys, which deletes every registered passkey in the same transaction

Raising protection needs nothing extra.

The credentials are checked before the transaction opens, and the relaxing terms are computed
again inside it against the fresh read. If a concurrent save changed what this one relaxes so
that it now needs credentials it was not given, it is refused with `SETTINGS_CONFLICT` rather than
applied. The transaction first takes `SELECT ... FOR UPDATE` on the Super Admin role row, so on
PostgreSQL and MySQL two saves cannot both make that fresh read before either commits. The settings
document itself may not exist yet, which is why a role row that always exists is locked. SQLite
ignores the clause and has a single writer.

Two exemption rules apply to a **password-less** (SSO-only) caller:

- For lowering enforcement or widening trust, they are refused with an explicit message telling
  them to ask an administrator who signs in with a password
- For a save whose **only** triggering term is disabling passkeys, they proceed on session
  authority. In an SSO-only organisation every administrator is password-less, so the strict rule
  would make the setting permanently unreachable. Combined with either of the other terms it is
  refused as normal

The server and the admin panel import the same downgrade rules from
`packages/core/admin/shared/utils/security-downgrade.ts`, so the UI never demands a credential the
server would not have asked for. The password-less exemption is mirrored client-side in
`pages/Settings/pages/Security/utils/isSecurityDowngrade.ts`, so the UI never routes a
password-less administrator into a dialog they cannot complete.

## What the UI shows

- **Settings > Security** (`pages/Settings/pages/Security/SecurityPage.tsx`): one card per policy
  object and one Save in the page header. The page owns one draft of all three objects, and
  `useSecuritySettingsSave` sends only the changed ones in a single `PUT`. A raise shows its impact
  dialog first; any downgrade in the save (one or several kinds) then opens one
  `ConfirmDowngradeDialog`. When the save combines several kinds, the dialog names each change on
  its own line: the roles no longer required (by name), "no longer required for everyone", the new
  grace or trust period against the old one, and the number of passkeys deleted. Leaving the page
  with unsaved changes asks for confirmation
- **Settings > Users**, list: a two-factor column ("Enabled", "Due {date}", "Locked", "Not
  enabled"), shown to holders of `admin::users.update` while the flag is on
- **Settings > Users**, per user (`pages/Settings/pages/Users/components/TwoFactorPanel.tsx`):
  enrolment state, lock state, the unlock and reset actions, plus trusted-device and passkey counts.
  An unlocked account has no lock and no grace, like one that never started. When the viewer may
  read the security settings and they require two-factor authentication of the user, the panel says
  "Not set up. A new {n}-day grace period starts at their next login." with the configured grace
  days. Without the settings, it says so without the number only after an unlock made on that page
  (it cannot tell an exempt SSO-only account from a required one either way)
- **Settings > Roles**, per role (`pages/Settings/pages/Roles/components/RoleTwoFactorRequirement.tsx`):
  a "Require two-factor authentication for this role" checkbox on `admin::role.mfaRequired`, shown
  to holders of `admin::security-settings.read` and `.update` while the feature is on. It saves on
  its own through `PUT /admin/security-settings` (`mfa.requiredRoles`), with the Security page's
  impact dialog on a raise and `ConfirmDowngradeDialog` on a drop. Under "Not required", checking it
  saves "Required for selected roles" with this role alone; unchecking the last selected role saves
  "Not required". It is disabled only while everyone is required. The grace-period hint shows only
  while the role requires it, and a line under the checkbox says how this relates to the Security
  page and links to it. The Security page's role picker links back to Settings > Roles
- **A grace banner** (`components/MfaGraceBanner.tsx`) for a user inside their grace period

`GET /admin/users` and `GET /admin/users/:id` append `mfaEnabledAt`, `mfaGraceUntil` and
`mfaLockedAt` for a caller holding `admin::users.update` (`withMfaState` in `controllers/user.ts`),
so the list shows state without a call per row.

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
