# Agent 6 — `nodemailer` 8 → 9 investigation

**Date:** 2026-06-27  
**Packages:** `@strapi/provider-email-nodemailer`, `@strapi/provider-email-sendmail`, `@strapi/email`  
**Verdict:** **Ship** — version bump only; non-breaking for typical Strapi usage  
**Draft PR:** https://github.com/strapi/strapi/pull/TBD  
**Branch:** `chore/deps-nodemailer-9`

---

## Summary

| Item                    | Result                                    |
| ----------------------- | ----------------------------------------- |
| Clears advisory         | GHSA-p6gq-j5cr-w38f (high)                |
| From → To               | `nodemailer@8.0.9` → `9.0.1`              |
| Code changes required   | None (pin bump only)                      |
| Provider unit tests     | ✅ 98 (nodemailer) + 44 (sendmail) passed |
| User config passthrough | Yes — full nodemailer transport options   |

---

## 1. Config flow: plugin settings → provider init

### User configuration

Users configure email in `config/plugins.js` (or env-specific overrides):

```js
email: {
  config: {
    provider: 'nodemailer', // or 'sendmail'
    providerOptions: { /* … */ },
    settings: {
      defaultFrom: '…',
      defaultReplyTo: '…',
    },
  },
},
```

### Core email plugin (`@strapi/email`)

| Step           | File                                               | What happens                                                                                                                           |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Default config | `packages/core/email/server/src/config.ts`         | Default provider is `sendmail`; `providerOptions: {}`                                                                                  |
| Bootstrap      | `packages/core/email/server/src/bootstrap.ts`      | Reads `strapi.config.get('plugin::email')`, resolves `@strapi/provider-email-{name}`, calls `provider.init(providerOptions, settings)` |
| Send API       | `packages/core/email/server/src/services/email.ts` | Delegates to `strapi.plugin('email').provider.send(options)` — no transformation of transport config                                   |

`EmailConfig.providerOptions` is typed as `object` — intentionally opaque so any provider-specific shape passes through.

### Nodemailer provider — **full passthrough**

```119:182:packages/providers/email-nodemailer/src/index.ts
type ProviderOptions = Parameters<typeof nodemailer.createTransport>[0];
// …
export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const transporter: Transporter = nodemailer.createTransport(providerOptions);
```

**Answer:** Yes. Users can pass any valid `nodemailer.createTransport()` option directly in `providerOptions` — host/port/auth, pool, dkim, proxy, OAuth2, `customAuth`, `tls`, etc. The README explicitly documents this (“…any custom nodemailer options”).

Send options are **not** passthrough: the provider allowlists ~30 fields and maps them to `sendMail()`. Unknown keys are dropped (security measure).

### Sendmail provider — **partial passthrough**

```18:44:packages/providers/email-sendmail/src/index.ts
export default {
  init(providerOptions: ProviderSendmailOptions, settings: Settings) {
    const mergedOptions: ProviderSendmailOptions = {
      silent: true,
      ...providerOptions,
    };
    // … send() merges extra keys onto SendMailOptions via rest spread
```

Sendmail uses nodemailer internally for MIME + SMTP delivery (`direct-smtp.ts`), but `providerOptions` are **sendmail-specific** (devPort, smtpHost, dkim, rejectUnauthorized) — not general nodemailer transport config. Users on sendmail cannot configure arbitrary nodemailer transport options.

---

## 2. Nodemailer 9 breaking changes vs Strapi usage

### Official breaking change (9.0.0)

**TLS certificate validation is now enforced by default** for HTTPS requests made while fetching remote content:

- Attachment `href` / `path` URLs (HTTP/HTTPS)
- OAuth2 token endpoint fetches
- HTTP/HTTPS proxy CONNECT tunnels

Previously `lib/fetch` hardcoded `rejectUnauthorized: false`. In v9, callers must opt out explicitly:

```js
// Transport-level (applies to OAuth2, proxy, default fetch TLS)
providerOptions: {
  tls: { rejectUnauthorized: false },
}

// Per-attachment (self-signed attachment host)
attachments: [{ href: 'https://internal/…', tls: { rejectUnauthorized: false } }]
```

Also in 9.0.0 (non-breaking for Strapi): internal `url.parse` → WHATWG URL wrapper.

### 9.0.1 patch

Enforces `disableFileAccess` / `disableUrlAccess` for the `raw` message option. Strapi’s nodemailer provider already exposes both flags — no Strapi code change needed; behavior is stricter for raw-MIME users who relied on bypassing those flags.

### Impact matrix

| Strapi usage pattern                               | Affected by v9? | Notes                                                               |
| -------------------------------------------------- | --------------- | ------------------------------------------------------------------- |
| Standard SMTP (host/port/auth, text/html)          | **No**          | Primary Strapi use case                                             |
| Local dev (Maildev/MailHog, `ignoreTLS: true`)     | **No**          | Plain SMTP to localhost                                             |
| File-path attachments                              | **No**          | No HTTPS fetch                                                      |
| Sendmail provider (MX delivery, `ignoreTLS: true`) | **No**          | Uses plain SMTP; `rejectUnauthorized` only applies if TLS were used |
| OAuth2 (Gmail, Outlook — public CAs)               | **No**          | Token endpoints use valid certs                                     |
| Remote URL attachments (`href: https://…`)         | **Maybe**       | Fails if host has self-signed/expired/mismatched cert               |
| OAuth2 against internal token server               | **Maybe**       | Same TLS requirement                                                |
| SOCKS/HTTP proxy with self-signed cert             | **Maybe**       | Proxy CONNECT now validated                                         |
| `proxy` in providerOptions without `tls`           | **Maybe**       | Users can add `tls: { rejectUnauthorized: false }`                  |

**SMTP STARTTLS / `secure` connections** are unchanged — the breaking change targets nodemailer’s internal HTTP fetch helper, not the SMTP socket TLS handshake (which already respected `tls.rejectUnauthorized` on the transport).

---

## 3. Can we patch user config + emit warnings?

### Recommendation: **Do not auto-patch**

Auto-injecting `tls: { rejectUnauthorized: false }` would restore the pre-v9 insecure default and re-open GHSA-p6gq-j5cr-w38f. That defeats the purpose of the major bump.

### Acceptable mitigations

1. **Version bump only (chosen for draft PR)** — correct for >95% of Strapi deployments using relay SMTP with inline content.
2. **Documentation** — note v9 TLS behavior in PR description / provider README (optional follow-up).
3. **Runtime warning (optional follow-up)** — at `init()`, if `providerOptions` contains `proxy`, OAuth2 `auth`, or is used with URL attachments, log a one-time hint that v9 validates remote TLS and link to opt-out. Not implemented in this PR to keep scope minimal.

Users who need legacy behavior already have the escape hatch via passthrough `providerOptions.tls`.

---

## 4. Implementation

### Changes

| File                                               | Change                 |
| -------------------------------------------------- | ---------------------- |
| `packages/providers/email-nodemailer/package.json` | `nodemailer` → `9.0.1` |
| `packages/providers/email-sendmail/package.json`   | `nodemailer` → `9.0.1` |
| `yarn.lock`                                        | Updated resolution     |

`@types/nodemailer@7.0.11` retained — API surface unchanged; `@types/nodemailer@8.x` adds no required fields for our usage.

`@strapi/email` — no direct nodemailer dependency; no changes.

### Tests run

```bash
yarn nx run @strapi/provider-email-nodemailer:test:unit  # 98 passed
yarn nx run @strapi/provider-email-sendmail:test:unit    # 44 passed
```

### Not run (manual follow-up)

- Smoke send via getstarted with default sendmail provider
- Live SMTP verify with nodemailer provider against Maildev

---

## 5. Options if we had blocked

Not applicable — upgrade is shippable. For reference:

| Option                                     | Pros                             | Cons                                                  |
| ------------------------------------------ | -------------------------------- | ----------------------------------------------------- |
| **A. Bump to 9.0.1 (chosen)**              | Clears advisory; secure defaults | Edge-case TLS failures for self-signed remote content |
| B. Stay on 8.x + npm override              | Zero user impact                 | Advisory remains                                      |
| C. Bump + auto `rejectUnauthorized: false` | Zero user breakage               | Security regression                                   |
| D. Bump + init warning                     | Good DX for edge cases           | Extra code; noisy if over-broad                       |

---

## 6. PR checklist

- [x] Pin bump in both provider packages
- [x] `yarn.lock` updated
- [x] Provider unit tests green
- [ ] CI (full monorepo)
- [ ] Manual smoke: email test button in admin
