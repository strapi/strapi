---
title: Admin trusted devices
description: 'How a browser earns the right to skip the admin second factor for a bounded period, and how that trust is bounded, listed and revoked.'
---

A trusted device is a browser allowed to skip the second factor until an absolute expiry. It
**grants nothing without the password**: the trust cookie replaces the code step of login, never
the password step. Read [Admin two-factor authentication](./01-admin-two-factor.md) first.

## The setting

Stored beside `mfa` in the same `security-settings` document (see
[Enforcement](./02-admin-mfa-enforcement.md)):

```ts
trustedDevices: { enabled: boolean, days: number }   // default { enabled: true, days: 30 }
```

`days` is an integer 1..90. Because it is a security relaxation, **enabling trust or raising
`days` while enabled requires re-authentication** on the `PUT`; lowering `days` or disabling does
not, since both only ever cut trust short.

`trustedDeviceDays` on the login challenge response carries the current value, or `null` when the
organisation does not offer trust. It is read per challenge and never cached, so a settings change
shows on the very next login screen.

## Granting trust

Any verified challenge can grant it. Pass `trustDevice: true` alongside the code:

```
POST /admin/login/mfa               { challengeToken, code, trustDevice: true, deviceId?, rememberMe? }
POST /admin/login/mfa/webauthn      { challengeToken, assertion, trustDevice: true, ... }
```

`trustDevice` is honoured only when the organisation allows it; a stale checkbox from a client
whose settings are out of date is ignored rather than treated as an error.

The service function that does this does **not** know which factor passed, which is exactly what
lets the passkey login path reuse it unchanged.

What happens on a grant, all inside one transaction:

1. A 256-bit random token is minted; only its **sha256** is stored. A plain hash, not bcrypt: the
   token is full-entropy random, so there is nothing to slow down a guesser about
2. A row is written with `expiresAt = now + days`, plus a device name parsed from the user agent
3. The per-user cap is applied, evicting the oldest rows beyond `MAX_TRUSTED_DEVICES_PER_USER`
   (10)
4. `device_trusted` is recorded

The grant and its audit row land or fail together. The event-hub notification is fired outside the
transaction, since it is fire-and-forget.

The raw token is returned exactly once, for the controller to set as the cookie.

## The cookie

`strapi_admin_mfa_trust`, with the same scope options as the refresh cookie
(`getRefreshCookieOptions`), plus an explicit `expires`/`maxAge` at the trust expiry. Revocation
clears it with those same scope options, so the browser matches and drops the right cookie.

## Effective expiry

```
effectiveExpiry(row) = min(row.expiresAt, row.createdAt + settings.days)
```

The stored expiry is the promise made at grant and never slides. The ceiling is the organisation's
current policy. Two consequences, both intended:

- **Lowering `days` cuts every existing trust immediately**, with no row rewrite and no migration
- **Raising `days` never extends an existing trust** beyond what was promised at grant

A row found dead is deleted at the point it is met, on login and on list. That is what stops a
later raise of `days` from reviving a trust an earlier cut had killed.

## Consuming trust at login

`POST /admin/login` reads the cookie **after** the password check and after enforcement (a locked
account is refused before anything else). Trust is consumed only for a live row **owned by the
user who just proved the password**. A row owned by someone else is left alone and simply refused,
so presenting a stolen cookie neither works nor destroys the real owner's trust.

On success the row's `lastUsedAt` is stamped, an audit-only `trusted_device_used` notice is
raised, and the login returns a session with no challenge. A cookie that is stale, dead, foreign,
or refused because the setting is now disabled is cleared from the browser.

## Managing trusted devices

The caller's own:

| Endpoint                                | Effect                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GET /admin/mfa/trusted-devices`        | Live rows, current first then newest. Dead rows met on the way are deleted                   |
| `DELETE /admin/mfa/trusted-devices/:id` | Revoke one. 204, or 404 when the row is not theirs. Clears the cookie if it was this browser |
| `DELETE /admin/mfa/trusted-devices`     | Revoke all. 204, clears the cookie                                                           |

An administrator's view of another user, gated like the users API itself:

| Endpoint                                      | Permission            |
| --------------------------------------------- | --------------------- |
| `GET /admin/mfa/users/:id/trusted-devices`    | `admin::users.read`   |
| `DELETE /admin/mfa/users/:id/trusted-devices` | `admin::users.update` |

A listed row never carries the token or its hash. `current` is decided by hashing the cookie the
browser presented, never by `deviceId`, and the hash never leaves the function that computes it.
The administrator view returns the same rows without `current`.

Row ids are integers, so a non-numeric `:id` is answered 404 directly rather than asked of the
database, where comparing an integer column against arbitrary text is a 500 on PostgreSQL rather
than a miss.

## Cascades

Trust is destroyed, not merely expired, when:

- The user disables 2FA, or their factor is reset
- An administrator revokes their devices
- The organisation turns the setting off (every row is cleared)

Expired rows are also swept at bootstrap, best-effort, for table hygiene only. Nothing about the
security of the flow depends on the sweep having run.

## Key files

- Service: `packages/core/admin/server/src/services/mfa-trusted-devices.ts` (composed into
  `services/mfa.ts`; it never reads the settings store itself, the policy is injected)
- Cookie helpers: `packages/core/admin/shared/utils/session-auth.ts`
- Controller: `packages/core/admin/server/src/controllers/mfa.ts`,
  `controllers/authentication.ts`
- Admin panel: `pages/Profile/TwoFactorSection.tsx`,
  `pages/Settings/pages/Security/components/TrustedDevicesCard.tsx`,
  `pages/Settings/pages/Users/components/TwoFactorPanel.tsx`
- Tests: `tests/api/core/admin/admin-mfa-trusted-devices.test.api.ts`,
  `tests/e2e/tests/admin/mfa-trusted-devices.spec.ts`
