---
title: Admin two-factor authentication
description: 'How TOTP second-factor authentication works for the admin panel: enrolment, login, recovery codes, throttling, and the data it stores.'
---

Two-factor authentication (2FA) for the admin panel, built on TOTP (RFC 6238). This page covers the
base factor. Three related pages cover the rest:

- [Enforcement](./02-admin-mfa-enforcement.md) — requiring 2FA, grace periods, locks
- [Trusted devices](./03-admin-trusted-devices.md) — skipping the code on a known browser
- [Passkeys](./04-admin-passkeys.md) — WebAuthn credentials as an alternative second factor

It is intentionally concise for contributors working in the monorepo.

## Feature gating

The feature is off unless **both** of these are true:

1. The future flag `unstableAdminMfa` is enabled (see [Future Flags](../../06-future-flags.md))
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
deployment does not advertise the endpoints or leak validation messages. The single source of this
decision is `isEnabled()` in `packages/core/admin/server/src/services/mfa.ts`.

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

- **Not enrolled:** the normal `Login.Response` with a session (see
  [Sessions and JWT](./00-sessions-and-jwt.md))
- **Enrolled:** `MfaChallengeResponse` instead, with **no cookie and no access token**

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
`assertFactor` runs, so a password guess cannot burn a victim's factor attempts.

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
| `webauthn.rpId` / `webauthn.origins` | derived   | See [Passkeys](./04-admin-passkeys.md)                     |

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
| `admin::mfa-trusted-device` | `strapi_admin_mfa_trusted_devices` | See [Trusted devices](./03-admin-trusted-devices.md) |
| `admin::mfa-passkey`        | `strapi_admin_mfa_passkeys`        | See [Passkeys](./04-admin-passkeys.md)               |

On `admin::user`:

| Field                                                 | Purpose                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `mfaSecret`                                           | Encrypted TOTP secret. Present means enrolled                        |
| `mfaPendingSecret`                                    | Enrolment in progress, not yet verified                              |
| `mfaEnabledAt`                                        | Enrolment timestamp. `mfaSecret` **and** this means enrolled         |
| `mfaLastUsedStep`                                     | Replay guard: a step cannot be reused                                |
| `mfaGraceUntil`, `mfaLockedAt`                        | Enforcement stamps, see [Enforcement](./02-admin-mfa-enforcement.md) |
| `mfaPasskeyChallenge`, `mfaPasskeyChallengeExpiresAt` | The one pending passkey registration ceremony                        |

Expired challenge and trusted-device rows are swept at bootstrap
(`server/src/bootstrap.ts`), wrapped in a `try`/`catch` so cleanup can never stop the admin
booting. Nothing about the security of the flow depends on the sweep having run: expired rows are
rejected, and deleted, on read.

## Notices and events

`recordEvent` writes an `admin::mfa-event` row and emits `admin.mfa.<type>` on the event hub, with
`_` replaced by `.` (so `challenge_failed` becomes `admin.mfa.challenge.failed`).

`GET /admin/mfa/notices` returns the caller's unseen rows; `POST /admin/mfa/notices/seen` marks
them (an absent `ids` marks all of the caller's, and it is always scoped to rows the caller owns).
Notice `metadata` is limited to neutral context and never carries a code, a secret or an otpauth
URI.

Thirteen of these names are on the EE audit-log allow-list
(`packages/core/admin/ee/server/src/audit-logs/services/lifecycles.ts`): `admin.mfa.enabled`,
`.disabled`, `.reset`, `.challenge.failed`, `.authenticator.replaced`, `.locked`, `.unlocked`,
`.device.trusted`, `.device.trust.revoked`, `.trusted.device.used`, `.passkey.registered`,
`.passkey.removed`, `.passkey.used`. Because these events can be raised by a request that has no
session (a failed login), the audit row is attributed to the `userId` in the payload for
`admin.mfa.*` names specifically.

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
[Enforcement](./02-admin-mfa-enforcement.md)). Both call the same service method. The CLI exists
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

| Kind           | Location                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Unit (server)  | `packages/core/admin/server/src/services/__tests__/mfa.test.ts`, `controllers/__tests__/mfa.test.ts` |
| Unit (admin)   | `packages/core/admin/admin/src/**/tests/` beside each component                                      |
| API            | `tests/api/core/admin/admin-mfa-{enforcement,trusted-devices,passkeys}.test.api.ts`                  |
| E2E            | `tests/e2e/tests/admin/mfa{,-enforcement,-trusted-devices,-passkeys}.spec.ts`                        |
| Shared helpers | `tests/utils/mfa.ts` (TOTP generation), `tests/api/core/admin/utils/mfa-state.ts` (state reset)      |

The e2e app template enables the future flag and sets a WebAuthn relying party, in
`tests/app-template/config/`. Running the e2e suites without that config leaves passkeys hidden;
see [Passkeys](./04-admin-passkeys.md).
