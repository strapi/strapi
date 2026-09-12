---
title: Admin passkeys (WebAuthn)
description: 'WebAuthn credentials as an admin second factor: relying-party resolution, the registration and login ceremonies, and the configuration a deployment needs.'
---

A passkey is a WebAuthn credential registered as a second factor. The private key never leaves the
authenticator, and the browser binds the credential to an origin, so a passkey cannot be phished
the way a typed code can. Read [Admin two-factor authentication](./01-admin-two-factor.md) first.

**TOTP stays the required base factor.** A passkey is an additional, stronger way to satisfy a
challenge, never a replacement for enrolment and never a way to log in without a password. There is
no passwordless flow here.

## Dependencies

| Package                   | Version | Where                       |
| ------------------------- | ------- | --------------------------- |
| `@simplewebauthn/server`  | 14.0.1  | `@strapi/admin` server side |
| `@simplewebauthn/browser` | 14.0.0  | `@strapi/admin` admin side  |

Both MIT, both dual CJS/ESM. Helpers live behind the `./helpers` subpath. `@strapi/admin`'s shared
contracts import the ceremony option types from `@simplewebauthn/browser` (type-only), never from
the server package, which must not be pulled into a bundle.

## Configuration: the relying party

This is the one part of the feature a deployment usually has to configure.

```ts
// config/admin.ts
export default ({ env }) => ({
  auth: {
    mfa: {
      webauthn: {
        rpId: 'admin.example.com',
        origins: ['https://admin.example.com'],
      },
    },
  },
});
```

Both keys are optional and default to being derived from `admin.absoluteUrl`: its hostname becomes
the relying-party id and its origin becomes the single expected origin.

Two common deployments therefore need **no passkey configuration at all**:

- **Development.** `getAbsoluteAdminUrl` rewrites a loopback or wildcard host to `localhost` when
  `config.environment === 'development'`, and `localhost` is a valid relying-party id and a secure
  context. So `yarn develop` works as-is, provided the browser reaches the admin at `localhost` and
  not at `127.0.0.1` (WebAuthn compares the origin exactly).
- **Any deployment that sets `server.url` or `admin.url`.** When either is an absolute URL,
  `getConfigUrls` returns it verbatim and the host-guessing branch never runs, so `rpId` and
  `origins` derive from the real public hostname. A Strapi behind a proxy has to set this anyway,
  or its webhook URLs, password-reset links and preview URLs are all wrong too.

:::caution
**The gap is a production deployment that never set `server.url`.** `admin.absoluteUrl` then falls
back to `http://<server.host>:<server.port>/admin`, and with the `HOST=0.0.0.0` every
`create-strapi-app` template writes, that is `http://0.0.0.0:1337/admin`. An IP literal is not a
valid relying-party id, so passkeys hide themselves everywhere and no ceremony can start. **TOTP,
enforcement and trusted devices are unaffected.**

The fix is either `server.url` (the one that fixes everything else too) or
`admin.auth.mfa.webauthn.rpId`. The refusal is logged at **error** level with the config key that
fixes it, once per process, and `bootstrap` asks for it at startup when the policy is on, so the
line appears in the startup log rather than only on the first `/mfa/me`.
:::

An IP literal cannot be made to work by configuration: the WebAuthn spec requires the relying-party
id to be a valid domain string, and browsers reject an address. `localhost` is the only host that
works without a domain. Mapping `0.0.0.0` to `localhost` outside development would be worse than
refusing, because in production that host means "bind every interface" and the real public hostname
is unknown, so the credentials minted would be bound to an origin nobody reaches the admin at.

The relying-party identity is deliberately **not** taken from the request's `Origin` header, even
though that would need no configuration and would survive any proxy. A fixed relying-party identity
is what WebAuthn's phishing resistance rests on; taking it from the request makes it
attacker-influenceable, and a credential could end up bound to a hostname the deployment never
meant to serve.

### What `resolveWebauthnRp` refuses

Every refusal names the config key that fixes it, and all of them surface to the caller as the same
message. On the two unauthenticated login routes the caller holds only a challenge token, so
deployment details are not theirs to learn.

| Refused                                                               | Why                                                                                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No usable `rpId` from either source                                   | Nothing to derive from                                                                                                                                     |
| An `rpId` starting with `.`                                           | Not a valid host                                                                                                                                           |
| An IP literal                                                         | No browser accepts one as a relying-party id; only `localhost` works without a domain                                                                      |
| A public suffix, or a bare label                                      | Browsers reject these. `localhost` is the exception                                                                                                        |
| `origins` that is not an array                                        | A string would iterate per character                                                                                                                       |
| An origin that is not a URL                                           |                                                                                                                                                            |
| An origin that is not a secure context                                | Must be `https:`, or `http://localhost[:port]`                                                                                                             |
| An origin that is neither the relying party nor a **subdomain** of it | Checked as `host === rpId \|\| host.endsWith('.' + rpId)`. The leading dot is load-bearing: a bare `endsWith` accepts `evil-example.com` for `example.com` |

`rpId` is lowercased and has every trailing DNS root dot stripped before use, and the normalised
value is what gets used, not merely what gets checked. The subdomain check runs for every origin
whether or not either key was set: in the fully derived case it is trivially satisfied, and the
dangerous case is `origins` configured against a _derived_ `rpId`, where nothing else relates the
two.

### Availability

`passkeysConfigured()` wraps that resolution in a boolean that cannot throw, so no caller can be
made to 500 by asking. Two fields compose it with the organisation policy:

- `passkeysEnabled` on `GET /admin/mfa/me` — the setting is on **and** the relying party resolves
- `passkeyAvailable` on the login challenge response — both of the above **and** this account holds
  at least one passkey

Neither ever advertises a button a misconfigured deployment cannot honour.

Telling a caller who already proved the password that the account has passkeys is not a new
disclosure: the challenge itself already reveals the account is enrolled.

## The setting

Stored beside `mfa` and `trustedDevices` in the `security-settings` document (see
[Enforcement](./02-admin-mfa-enforcement.md)):

```ts
passkeys: {
  enabled: boolean;
} // default { enabled: true }
```

**Turning it off deletes every registered passkey**, organisation-wide, inside the same transaction
as the settings write. That is why the `PUT` treats it like a downgrade and demands
re-authentication: a stolen session must not be able to wipe every phishing-resistant credential
with one request and a dialog the attacker is not looking at. Turning them **on** requires nothing
extra, since it strengthens the second factor and destroys nothing.

The one exemption: a caller with no local password (SSO-only) may turn passkeys off on session
authority alone, when that is the **only** relaxing term in the save. Otherwise, in an SSO-only
organisation, nobody could ever reach the setting.

## Registration

Two calls. The gate is on the first one.

| Endpoint                           | Body                     | Returns                                  |
| ---------------------------------- | ------------------------ | ---------------------------------------- |
| `POST /admin/mfa/passkeys/options` | `{ password, code }`     | `PublicKeyCredentialCreationOptionsJSON` |
| `POST /admin/mfa/passkeys`         | `{ name, registration }` | The created `Passkey`                    |

The options call costs the current password **and** a live second factor
(`assertPasswordAndFactor`). Under this factor model the new credential satisfies every future
challenge on its own, so a password-only gate would be a weaker check on a stronger operation.
The completion call needs neither: the ceremony it finishes was already authorised, and it is
single-use.

Refusals before the ceremony starts:

- The organisation has passkeys off: `Passkeys are disabled`
- The account has no authenticator yet: `Set up an authenticator app before adding a passkey.`
- The user already holds `MAX_PASSKEYS_PER_USER` (10): `You can register at most 10 passkeys.`

The cap is a **contract constant**, exported from `shared/contracts/mfa.ts`, precisely so the admin
panel can stop offering "Add a passkey" rather than spend a password and a live code on a
guaranteed rejection.

The pending ceremony lives on `admin::user.mfaPasskeyChallenge` with its own
`mfaPasskeyChallengeExpiresAt`, mirroring how `mfaPendingSecret` handles a pending enrolment. Only
one registration ceremony can be in flight per account.

`name` is user-supplied, trimmed, 1..50 characters. There is no rename route.

The response is passed through verbatim to `@simplewebauthn/browser`'s
`startRegistration({ optionsJSON })`.

## Login

| Endpoint                                 | Body                                                                  | Notes                                                       |
| ---------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `POST /admin/login/mfa/webauthn/options` | `{ challengeToken }`                                                  | Unauthenticated; the challenge token is the only credential |
| `POST /admin/login/mfa/webauthn`         | `{ challengeToken, assertion, trustDevice?, deviceId?, rememberMe? }` | Issues a session exactly as `/login/mfa` does for a code    |

The options call **charges no attempt**, because it evaluates no factor. It does still check the
account throttle and the challenge's usability, which is what stops it being an unmetered oracle.
The policy check runs before the credential query, so a deployment with passkeys off performs no
database read at all.

`deviceId` and `rememberMe` are not decoration on the completion call: `issueSession` reads both
from that body, so omitting them loses the caller's "remember me" choice and leaves a
trusted-device row's `deviceId` null. `trustDevice` works exactly as it does for a code (see
[Trusted devices](./03-admin-trusted-devices.md)); the trust-granting function does not know which
factor passed.

The signature counter is stored and updated on every successful assertion. The library raises on a
counter regression, which is the clone signal.

A stored `credentialId` that is not valid base64url is **skipped and logged at error level**, never
returned as a 400 and never deleted. Without that filter, one corrupt row would make the library
throw a bare `Error` on an unauthenticated route, surfacing as a 500 that echoes the stored id
back and bricks passkey login for that account.

## Managing passkeys

The caller's own:

| Endpoint                         | Effect                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/mfa/passkeys`        | Newest first. An **empty list** when the organisation has passkeys off, so this and the administrator count never disagree |
| `DELETE /admin/mfa/passkeys/:id` | 204, or 404 when the row is not theirs                                                                                     |

Deletion costs nothing and works even while the policy is off. TOTP always survives a passkey
deletion, so there is no lockout path, and removing a credential is never the dangerous direction.

An administrator's view of another user:

| Endpoint                               | Permission            | Returns                                             |
| -------------------------------------- | --------------------- | --------------------------------------------------- |
| `GET /admin/mfa/users/:id/passkeys`    | `admin::users.read`   | `{ count }`, `{ count: 0 }` while the policy is off |
| `DELETE /admin/mfa/users/:id/passkeys` | `admin::users.update` | 204                                                 |

A count, not an inventory of somebody's hardware.

A listed passkey carries exactly four fields: `id`, `name`, `createdAt`, `lastUsedAt`.
`publicKey`, `counter`, `credentialId` and `transports` never leave the server.

## Data model

`admin::mfa-passkey`, table `strapi_admin_mfa_passkeys`. All attributes `private`, hidden from the
Content Manager and Content-Type Builder.

| Attribute      | Type               | Notes                                                                                                   |
| -------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| `userId`       | `string`           |                                                                                                         |
| `credentialId` | `string`, unique   | Base64URL                                                                                               |
| `publicKey`    | `text`             | Base64URL of the COSE key. **`text`, not `string`**: an RS256 COSE key does not fit in a varchar column |
| `counter`      | `biginteger`       | Reads back as a string, so every use passes it through `Number(...)`                                    |
| `transports`   | `string`           |                                                                                                         |
| `name`         | `string`, required |                                                                                                         |
| `lastUsedAt`   | `datetime`         |                                                                                                         |

Passkeys are cascaded away when the user disables 2FA, when their factor is reset, when an
administrator clears them, and when the organisation turns the setting off.

## Testing

Chromium's CDP virtual authenticator is what makes an e2e passkey journey possible, so
`tests/e2e/tests/admin/mfa-passkeys.spec.ts` is **Chromium-only by design**; the firefox and webkit
projects are explicit skips with a reason, not failures.

The e2e app template configures a relying party that matches the test server, in
`tests/app-template/config/admin.js`:

```js
mfa: {
  webauthn: {
    rpId: 'localhost',
    origins: [`http://localhost:${env.int('PORT', 1337)}`],
  },
},
```

Without it the derived `rpId` would be an IP literal and every passkey surface would correctly
hide itself, so the journeys would fail for a configuration reason rather than a code one.

Note that the design system renders tables as a **grid**, so Playwright locators for passkey rows
use `role="gridcell"`, not `cell`.

| Kind          | Location                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (server) | `packages/core/admin/server/src/services/__tests__/mfa-passkeys-rp.test.ts` (relying-party resolution) and the passkey blocks of `__tests__/mfa.test.ts` |
| Unit (admin)  | `pages/Profile/tests/Passkeys.test.tsx`, `utils/tests/webauthn.test.ts`, `pages/Settings/pages/Security/components/tests/PasskeysCard.test.tsx`          |
| API           | `tests/api/core/admin/admin-mfa-passkeys.test.api.ts`                                                                                                    |
| E2E           | `tests/e2e/tests/admin/mfa-passkeys.spec.ts`                                                                                                             |

## Key files

- Service: `packages/core/admin/server/src/services/mfa-passkeys.ts` (`resolveWebauthnRp`, both
  ceremonies, the cascades). Composed into `services/mfa.ts`, which wraps the two registration
  entry points so the policy and enrolment invariants hold for every caller, not only the
  controller
- Content type: `packages/core/admin/server/src/content-types/mfa-passkey.ts`
- Contracts: `packages/core/admin/shared/contracts/mfa.ts`
- Admin panel: `admin/src/utils/webauthn.ts` (browser-support detection and the ceremony wrappers),
  `pages/Profile/{Passkeys,AddPasskeyDialog}.tsx`,
  `pages/Auth/components/MfaChallenge.tsx`,
  `pages/Settings/pages/Security/components/PasskeysCard.tsx`
