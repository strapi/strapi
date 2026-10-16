---
title: Admin two-factor authentication
description: 'How TOTP second-factor authentication works for the admin panel: enrolment, login, recovery codes, throttling, and the data it stores.'
status: needs-review
review_notes:
  - Corrected on 2026-10-16 against a code review of the branch, which found fifteen statements that no longer matched the code. The corrections are checked; the rest of the page has not been re-verified claim by claim, and needs a maintainer pass before the status is removed.
---

Two-factor authentication (2FA) for the admin panel, built on TOTP (RFC 6238). This page covers the
base factor. Three related pages cover the rest:

- [Enforcement](./13-admin-mfa-enforcement.md): requiring 2FA, grace periods, locks
- [Trusted devices](./14-admin-trusted-devices.md): skipping the code on a known browser
- [Passkeys](./15-admin-passkeys.md): WebAuthn credentials as an additional second factor

It is intentionally concise for contributors working in the monorepo.

## Feature gating

The feature is off unless **both** of these are true:

1. The future flag `unstableAdminMfa` is enabled (see [Future Flags](./10-future-flags.md))
2. `admin.auth.mfa.enabled` is not `false` (it defaults to `true`)

```ts
// config/features.ts
export default {
  future: {
    unstableAdminMfa: true,
  },
};
```

Every MFA route returns **404 before body validation** when the feature is off, so a disabled
deployment does not advertise the endpoints or leak validation messages. That is one registered
policy, `admin::isMfaEnabled` (`server/src/policies/isMfaEnabled.ts`), carried by every MFA route
including the three `/login/mfa*` ones and the security-settings pair. Being a policy is what puts
it ahead of body validation: validating first would answer 400 for a malformed body and 404 for a
well-formed one, and that difference is itself a feature-presence tell. It calls `isEnabled()` in
`server/src/services/mfa.ts` on every request. The future flag is read each time, but
`admin.auth.mfa` is read once and cached for the life of the process, so changing it needs a
restart, like any other file-based configuration.

Turning `admin.auth.mfa.enabled` off does **not** delete enrolment data. Nobody is challenged and
nobody is locked out, and re-enabling restores the previous state. That is what makes it usable as
a kill switch.

## Enrolment

Three calls, in order. `secret`/`otpauthUri` and the recovery codes are each returned **exactly
once** and never again.

| Endpoint                             | Body                  | Returns                       |
| ------------------------------------ | --------------------- | ----------------------------- |
| `POST /admin/mfa/enrol`              | `{ password, code? }` | `{ secret, otpauthUri }`      |
| `POST /admin/mfa/enrol/verify`       | `{ code }`            | `{ recoveryCodes, replaced }` |
| `POST /admin/mfa/recovery-codes/ack` | none                  | 204                           |

`code` on `/mfa/enrol` is **required when the account is already enrolled**: that call then
replaces the authenticator, and the current factor has to be proved. It is ignored on a fresh
enrolment, where there is no factor yet.

The secret lands in `mfaPendingSecret` and is promoted to `mfaSecret` only by a successful
`/mfa/enrol/verify`, so an abandoned enrolment never leaves a half-enabled account.

`/mfa/recovery-codes/ack` exists so the UI can stop nagging. `codesAcknowledged` on `/mfa/me`
reflects it.

## Login

`POST /admin/login` returns one of two shapes for a correct password:

- **Not enrolled,** or enrolled and presenting a valid trust cookie: the normal `Login.Response`
  with a session (see [Sessions and JWT](./08-authentication.md) and
  [Trusted devices](./14-admin-trusted-devices.md))
- **Enrolled:** `MfaChallengeResponse` instead, with **no cookie and no access token**

`POST /admin/reset-password` answers an enrolled account the same way. It never honours a trust
cookie: a reset is the classic second-factor bypass.

```jsonc
{
  "data": {
    "mfaRequired": true,
    "challengeToken": "...", // authorises exactly one follow-up call
    "expiresIn": 300,
    "trustedDeviceDays": 30, // or null; see Trusted devices
    "passkeyAvailable": true, // see Passkeys
  },
}
```

The caller then completes the challenge:

| Endpoint                                 | Body                                                                  | Notes                                        |
| ---------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| `POST /admin/login/mfa`                  | `{ challengeToken, code, deviceId?, rememberMe?, trustDevice? }`      | `code` is a TOTP code **or** a recovery code |
| `POST /admin/login/mfa/webauthn/options` | `{ challengeToken }`                                                  | Passkey ceremony, charges no attempt         |
| `POST /admin/login/mfa/webauthn`         | `{ challengeToken, assertion, trustDevice?, deviceId?, rememberMe? }` | Passkey assertion                            |

All four routes are `auth: false` and carry `admin::rateLimit`. The challenge token is the only
credential on the follow-up call, and it is single-use.

`deviceId` and `rememberMe` matter on the follow-up call, not just on `/login`: `issueSession`
reads both from that request body, so omitting them loses the user's "remember me" choice.

## Disabling

`POST /admin/mfa/disable` takes `{ password, code }`, the same gate as regenerating recovery codes:
the session may be the thing an attacker holds. In order:

- It is refused with 403 `MfaRequiredError` while the policy requires the account, before any
  attempt is spent.
- It needs the session manager, and answers 500 without it.
- On success it removes the secret, the recovery codes, every trusted device and every passkey,
  evicts the user's sessions on other devices while keeping the caller's, and answers 204.

An administrator resets somebody else's factor through `POST /admin/mfa/users/:id/reset`. That
route refuses the caller's own id: on yourself it would be a cheaper `/mfa/disable`, with no
password, no code and no `MfaRequiredError` check.

## Recovery codes

One row per code (`admin::mfa-recovery-code`), so consuming one is a row update rather than a
rewrite of a set. Codes are 10 Crockford base32 characters, bcrypt-hashed, single use.

`POST /admin/mfa/recovery-codes` replaces the whole set. It requires the current password **and** a
live second factor, the same gate as `/mfa/disable`.

Recovery-code verification is deliberately independent of the encryption key: rotating
`ENCRYPTION_KEY` breaks TOTP (the secret can no longer be decrypted) but leaves recovery codes
working, which is the intended escape hatch.

## Throttling

Two tiers, both required. The per-challenge cap alone is bypassed by minting a fresh challenge
after a few guesses, which is why the account tier exists (NIST SP 800-63B).

| Tier          | Setting                                    | Default     | Effect when exceeded                           |
| ------------- | ------------------------------------------ | ----------- | ---------------------------------------------- |
| Per challenge | `maxChallengeAttempts`                     | 5           | The challenge reports `exhausted`              |
| Per account   | `maxUserAttempts` over `userAttemptWindow` | 10 per 900s | 429 on challenge create, `throttled` on verify |

The account tier counts `challenge_failed` rows in `admin::mfa-event`, so it is durable across
process restarts. A wrong **password** never records one: `assertPasswordAndFactor` throws before
`assertFactor` runs, so a password guess cannot burn a victim's factor attempts. Enrolment
verification (`/mfa/enrol/verify`) checks and records against the same account tier.

The routes that verify a password or a code also carry `admin::rateLimit`. With a session, the
limiter keys on the account and the route pattern (`rateLimitKey` in
`server/src/middlewares/rateLimit.ts`), so administrators behind one address do not share a bucket
and a parameter in the path does not buy a fresh one. Without a session it keys on the email in the
body, the path and the address, as on `/login`. `/reset-password` uses `admin::mfa-rate-limit`,
the same limiter applied only while the feature is on, because that route exists without it.

## Configuration

All keys live under `admin.auth.mfa` in `config/admin.(js|ts)`.

| Key                                  | Default   | Notes                                                      |
| ------------------------------------ | --------- | ---------------------------------------------------------- |
| `enabled`                            | `true`    | Kill switch. Leaves enrolment data intact                  |
| `digits`                             | `6`       | Must be 6, 7 or 8; anything else falls back with a warning |
| `step`                               | `30`      | Seconds per TOTP step                                      |
| `window.back` / `window.forward`     | `1` / `0` | Steps of clock skew tolerated                              |
| `challengeTtl`                       | `300`     | Seconds a challenge stays usable                           |
| `maxChallengeAttempts`               | `5`       | Per-challenge guesses                                      |
| `maxUserAttempts`                    | `10`      | Account-scoped failures                                    |
| `userAttemptWindow`                  | `900`     | Seconds the account counter looks back over                |
| `recoveryCodeCount`                  | `10`      | Codes minted per set                                       |
| `issuer`                             | app name  | Shown in the authenticator app                             |
| `emailTemplate`                      | built-in  | `{ subject, text, html }` for the "settings changed" mail  |
| `webauthn.rpId` / `webauthn.origins` | derived   | See [Passkeys](./15-admin-passkeys.md)                     |

`validateMfaConfig` (`server/src/config/mfa.ts`) applies one rule consistently: values that would
break authenticator interoperability or lock everyone out fall back to the default with a warning;
values that merely weaken security are **honoured** with a warning, because that is the operator's
call. A non-object `admin.auth.mfa` (a string, an array) is replaced with the defaults rather than
spread into indexed keys.

Enrolment needs `admin.secrets.encryptionKey` (`ENCRYPTION_KEY`). Without it, enabling 2FA fails
with an explicit error rather than storing a plaintext secret.

## Data model

All five content types are hidden from the Content Manager and the Content-Type Builder, and every
attribute is `private`.

| UID                         | Table                              | Holds                                                |
| --------------------------- | ---------------------------------- | ---------------------------------------------------- |
| `admin::mfa-challenge`      | `strapi_admin_mfa_challenges`      | Pending challenges. Grants no access on its own      |
| `admin::mfa-recovery-code`  | `strapi_admin_mfa_recovery_codes`  | One row per code, bcrypt-hashed                      |
| `admin::mfa-event`          | `strapi_admin_mfa_events`          | In-app notices, and the account attempt counter      |
| `admin::mfa-trusted-device` | `strapi_admin_mfa_trusted_devices` | See [Trusted devices](./14-admin-trusted-devices.md) |
| `admin::mfa-passkey`        | `strapi_admin_mfa_passkeys`        | See [Passkeys](./15-admin-passkeys.md)               |

On `admin::user`:

| Field                                                 | Purpose                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `mfaSecret`                                           | Encrypted TOTP secret. Present means enrolled                        |
| `mfaPendingSecret`                                    | Enrolment in progress, not yet verified                              |
| `mfaEnabledAt`                                        | Enrolment timestamp. `mfaSecret` **and** this means enrolled         |
| `mfaLastUsedStep`                                     | Replay guard: a step cannot be reused                                |
| `mfaGraceUntil`, `mfaLockedAt`                        | Enforcement stamps, see [Enforcement](./13-admin-mfa-enforcement.md) |
| `mfaPasskeyChallenge`, `mfaPasskeyChallengeExpiresAt` | The one pending passkey registration ceremony                        |

Expired challenge and trusted-device rows are swept at bootstrap and again daily at 03:30
(`server/src/bootstrap.ts`, through `strapi.cron.add`). The sweep is wrapped in a `try`/`catch` so
cleanup can never stop the admin booting. Nothing about the security of the flow depends on the
sweep having run: expired rows are rejected, and deleted, on read. Both tables index `expires_at`,
so the sweep does not read the whole table to find the expired set.

Every instance runs the sweep. In a deployment with several replicas they all issue the same
`DELETE` at boot and at 03:30. The delete is idempotent, so this is not a correctness problem, but
it is one statement per replica against the same two tables at the same moment.

## Notices and events

Two functions in `server/src/services/mfa.ts` record what happens:

- `recordEvent` writes an `admin::mfa-event` row, and prunes the user's oldest rows past a soft cap
  when no transaction is open.
- `notify` emits `admin.mfa.<type>` on the event hub, with `_` replaced by `.` (so
  `challenge_failed` becomes `admin.mfa.challenge.failed`). It emails the account holder only for
  `enabled`, `disabled`, `reset` and `authenticator_replaced`. `trusted_device_used` and
  `passkey_used` are emitted with no row.

`GET /admin/mfa/notices` returns the caller's unseen rows; `POST /admin/mfa/notices/seen` marks
them (an absent `ids` marks all of the caller's, and it is always scoped to rows the caller owns).
Notice `metadata` is limited to neutral context and never carries a code, a secret or an otpauth
URI.

The EE audit log records thirteen of these, plus `admin.auth.mfa_required` and
`admin.security-settings.update`, on the standard shape. They are registered through
`registerEvent` in `server/src/audit-logs/mfa.ts`. The actor is the session user when there is one
and `unknown` when there is not, as on `/login/mfa`, and the account the event concerns is the
`resource`. Attributing a sessionless row to the account holder would put a failed guess by an
attacker on the victim's name. A settings save records only the fields that changed, as
`{ before, after }`.

The errors a user can hit carry a stable `details.code` (`shared/utils/mfa-error-codes.ts`), which
the admin panel maps to a translated message. The English server message is the fallback.

## CLI

Three commands, for the case where an admin can no longer get in. Each takes `-e, --email`.

```bash
strapi admin:mfa-state -e user@example.com        # print a user's 2FA state
strapi admin:reset-user-mfa -e user@example.com   # clear their second factor (alias: admin:reset-mfa)
strapi admin:unlock-user-mfa -e user@example.com  # lift an enforcement lock (alias: admin:unlock-mfa)
```

`reset-user-mfa` and `unlock-user-mfa` are deliberately separate: a reset clears the factor but
does **not** lift an enforcement lock, and an unlock restarts the grace period without touching the
factor.

The reset is also available in the panel, on the user edit page, as `POST
/admin/mfa/users/:id/reset` behind `admin::users.update` (see
[Enforcement](./13-admin-mfa-enforcement.md)). Both call the same service method. The CLI exists
for when nobody can sign in at all; the panel action for the ordinary case of one user who lost
their authenticator.

## Status endpoint

`GET /admin/mfa/me` is the one call the admin UI polls for state. It never carries the secret, an
otpauth URI or a recovery code:

```jsonc
{
  "data": {
    "enabled": true,
    "enabledAt": "...",
    "recoveryCodesRemaining": 8,
    "codesAcknowledged": true,
    "required": false, // policy requires this account to enrol
    "graceUntil": null, // ISO deadline of a running grace period
    "trustedDevicesEnabled": true,
    "passkeysEnabled": true,
    "hasLocalPassword": true, // false for an SSO-only administrator
  },
}
```

## Key files

Server:

- Service: `packages/core/admin/server/src/services/mfa.ts` (the hub; the other three modules are
  composed into it so policy and enrolment invariants hold for every caller)
- Config validation: `packages/core/admin/server/src/config/mfa.ts`
- Controllers: `packages/core/admin/server/src/controllers/mfa.ts`,
  `controllers/authentication.ts`
- Routes: `packages/core/admin/server/src/routes/mfa.ts`, `routes/authentication.ts`
- Validation: `packages/core/admin/server/src/validation/authentication/mfa.ts`
- Contracts: `packages/core/admin/shared/contracts/mfa.ts`
- CLI: `packages/core/strapi/src/cli/commands/admin/{mfa-state,reset-user-mfa,unlock-user-mfa}.ts`

Admin panel:

- Data layer: `packages/core/admin/admin/src/services/mfa.ts`
- Profile: `packages/core/admin/admin/src/pages/Profile/TwoFactorSection.tsx`
- Login: `packages/core/admin/admin/src/pages/Auth/components/MfaChallenge.tsx`
- Notices: `packages/core/admin/admin/src/features/MfaNotices.tsx`

## Tests

| Kind           | Location                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (server)  | `packages/core/admin/server/src/services/__tests__/mfa.test.ts`, `controllers/__tests__/mfa.test.ts`                                                      |
| Unit (admin)   | `packages/core/admin/admin/src/**/tests/` beside each component                                                                                           |
| API            | `tests/api/core/admin/admin-mfa-*.test.api.ts`: TOTP, enforcement, trusted devices, passkeys (incl. real cryptography), throttling, concurrency, flag off |
| E2E            | `tests/e2e/tests/admin/mfa{,-enforcement,-trusted-devices,-passkeys}.spec.ts`                                                                             |
| Shared helpers | `tests/utils/mfa.ts` (TOTP generation), `tests/api/core/admin/utils/mfa-state.ts` (state reset)                                                           |

The app template enables the future flag and sets a WebAuthn relying party, in
`tests/app-template/config/`. Both the API and the e2e apps are generated from it, so every suite
runs with the flag on except `admin-mfa-flag-off.test.api.ts`, which boots its own instance with
`UNSTABLE_ADMIN_MFA=false`. Running the e2e suites without that config leaves passkeys hidden; see
[Passkeys](./15-admin-passkeys.md).
