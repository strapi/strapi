---
title: Provider-managed email templates
description: Route core and plugin transactional emails to templates hosted on the email provider
tags:
  - email
  - users-permissions
  - providers
---

# Provider-managed email templates

## Summary

Strapi renders every transactional email locally with lodash templates and hands the provider a
finished `subject` / `text` / `html`. Teams whose email already lives on Brevo, SendGrid or
Mailgun own their templates in the provider's visual editor — with that provider's versioning,
preview and approval workflow — but Strapi offers no way to point a core email at one. Today they
either duplicate the design inside a plain textarea in the admin panel, or fork the plugin.

This RFC proposes an **additive, config-gated** mechanism:

- one optional method, `sendTemplate`, on the email provider interface;
- a config-only map from stable _template keys_ to provider template ids;
- a normalized, versioned payload contract per key, so a template author in Brevo can rely on
  what arrives in `params`.

Absent configuration, **not one line of new behavior executes** and every existing app, template
and third-party provider keeps working byte-for-byte.

Scope covers the three built-in transactional emails and defines the contract any plugin can use
for its own emails. A first-party `@strapi/provider-email-brevo` package is proposed as the
reference implementation.

## Detailed design

### Current state

There are exactly three core transactional emails. Admin user invitation is _not_ one of them —
it surfaces the registration link in the admin UI and sends no mail.

| Email                                | Call site                                                                                            | Path used                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
| users-permissions reset password     | `packages/plugins/users-permissions/server/src/controllers/auth.js` (`forgotPassword`)               | `email.send()`               |
| users-permissions email confirmation | `packages/plugins/users-permissions/server/src/services/user.js` (`sendConfirmationEmail`)           | `email.send()`               |
| admin forgot password                | `packages/core/admin/server/src/services/auth.ts` and the EE variant under `packages/core/admin/ee/` | `email.sendTemplatedEmail()` |

Four properties of the current implementation shape this design:

1. **Providers already spread unknown keys through to the vendor SDK.** `email-sendgrid` and
   `email-mailgun` both destructure the known fields and spread `...rest` into the vendor payload.
   So a hand-rolled `send()` carrying a Brevo `templateId` "sort of" works already — but nothing
   in core drives it, and core has no way to know whether a provider handled the key or blindly
   forwarded it into a 400.
2. **`sendTemplatedEmail` hard-requires `subject`, `text` and `html`** and throws listing whichever
   are missing. A provider-hosted template has no local body at all, so this path cannot serve it.
3. **The content-API send route rejects structured parameters.** `sendEmailInput` is
   `z.object({ ... }).catchall(z.string())`, so an object-valued `params` or `dynamicTemplateData`
   cannot pass validation. `subject` and `text` are also required.
4. **The three emails expose inconsistent variable sets.** users-permissions uses
   `URL`, `TOKEN`, `CODE`, `USER`, `SERVER_URL`, `ADMIN_URL` and passes a _base_ URL for the
   template to concatenate; admin uses lowercase `url` and `user` and passes a _finished_ URL.
   Both users-permissions call sites also send the HTML body verbatim as the `text/plain` part.

A capability-declaration mechanism already exists: `ProviderCapabilities` in
`packages/core/email/shared/types.ts`, surfaced by `getSettings` in the email controller.

### Provider interface

One new optional method on `EmailProvider` in `packages/core/email/server/src/bootstrap.ts`:

```ts
interface EmailProvider {
  send: (options: SendOptions) => Promise<any>;
  /** NEW — optional. Absence means this provider cannot render provider-hosted templates. */
  sendTemplate?: (options: SendTemplateOptions) => Promise<any>;
  verify?: () => Promise<boolean>;
  isIdle?: () => boolean;
  close?: () => void;
  getCapabilities?: () => ProviderCapabilities;
}
```

Support is detected **structurally** — `typeof provider.sendTemplate === 'function'` — not via a
`features: ['remote-templates']` string. The email controller already probes `verify`, `isIdle`
and `getCapabilities` exactly this way, and a `features` entry would be a second source of truth
that a provider author can forget to keep in sync with the method they implemented. Core _derives_
the feature string for the admin panel:

```ts
// controllers/email.ts, getSettings
const supportsTemplates = typeof provider?.sendTemplate === 'function';
const capabilities = provider?.getCapabilities?.();
const features = [
  ...(capabilities?.features ?? []),
  ...(supportsTemplates ? ['remote-templates'] : []),
];
```

The signature takes a single object rather than `(options, templateRef, data)`. It mirrors
`send(options)`, lets providers destructure the way they already do, and stays extensible without
accumulating positional arguments.

`EmailProvider` and `EmailProviderModule` are structurally typed, and third-party providers exist
in the wild. Every addition here is optional, so an existing provider implementing only `send`
continues to satisfy the interface unchanged.

### Type changes

`EmailOptions` declares `[key: string]: string | undefined`. Any interface extending it with a
structured `template` field therefore fails to compile (TS2411 — a property whose type is not
assignable to the index signature). A small split is a prerequisite:

```ts
/** Addressing only — no index signature, so structured fields can be added downstream. */
export interface EmailAddresses {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}

/** Public shape unchanged; now built on EmailAddresses. */
export interface EmailOptions extends EmailAddresses {
  [key: string]: string | undefined;
}

export interface RemoteTemplateRef {
  /** Provider-side identifier, always a string at the core boundary.
   *  Providers coerce as needed (Brevo wants a number, SendGrid a `d-` prefixed string). */
  id: string;
  /** Optional provider-specific version or variant. Ignored where the concept does not exist. */
  version?: string;
}

export interface SendTemplateOptions extends EmailAddresses {
  template: RemoteTemplateRef;
  /** Named parameters, JSON-serializable. Brevo `params`, SendGrid `dynamicTemplateData`,
   *  Mailgun `h:X-Mailgun-Variables`. */
  data: Record<string, unknown>;
  /** Subject override where the provider permits it. Most callers omit it: the subject
   *  lives in the provider-side template. */
  subject?: string;
}

export interface RemoteTemplateConfig {
  id: string;
  version?: string;
  from?: string;
  replyTo?: string;
  /** Static params merged *under* the generated payload — generated values win. */
  params?: Record<string, unknown>;
}

export interface EmailTemplatesConfig {
  /** 'strict' (default) rethrows provider errors; 'fallback' renders the local template. */
  onError?: 'strict' | 'fallback';
  keys?: Record<string, string | RemoteTemplateConfig>;
}

export interface EmailConfig extends Record<string, unknown> {
  provider: string;
  providerOptions?: object;
  settings?: {
    defaultFrom?: string;
    defaultReplyTo?: string; // every provider already reads this; the type never declared it
  };
  templates?: EmailTemplatesConfig; // NEW
}
```

### Template keys

Keys are plain namespaced strings, defined in a new
`packages/core/email/server/src/constants.ts`:

```ts
export const CORE_EMAIL_TEMPLATE_KEYS = {
  ADMIN_FORGOT_PASSWORD: 'email::admin.forgot-password',
  UP_RESET_PASSWORD: 'email::users-permissions.reset-password',
  UP_EMAIL_CONFIRMATION: 'email::users-permissions.email-confirmation',
} as const;
```

The `email::` prefix is deliberate. `plugin::` and `admin::` form the content-type and permission
UID grammar — `plugin::users-permissions.user`, `admin::user` — parsed by `strapi.getModel`, the
permission engine and the sanitizers. Minting non-UID identifiers into that namespace invites a
collision that surfaces late and confusingly. Plugin authors follow the same convention for their
own emails: `email::my-plugin.some-notification`.

**There is deliberately no `strapi.emailTemplates` registry.** A registry in the style of
`packages/core/core/src/registries/custom-fields.ts` costs a registry module, a container entry,
`Core.Strapi` type surface, register-versus-bootstrap ordering rules, and an admin endpoint to
enumerate it. The only capability it buys over a plain string is enumeration for the admin UI —
and `Object.keys(config.templates.keys)` provides that for free. Per-key payload schema validation
sounds attractive but is unenforceable: the authoritative schema is the template itself, and it
lives in Brevo, not in Strapi. Core validating its own payload against its own declaration proves
nothing about whether the email will render.

### Configuration

The key-to-id mapping lives in `config/plugins.ts`, not in the plugin store:

```ts
export default ({ env }) => ({
  email: {
    config: {
      provider: 'brevo',
      providerOptions: { apiKey: env('BREVO_API_KEY') },
      settings: {
        defaultFrom: 'Acme <no-reply@acme.io>',
        defaultReplyTo: 'support@acme.io',
      },
      templates: {
        onError: 'strict', // default; 'fallback' is opt-in
        keys: {
          'email::admin.forgot-password': {
            id: env('BREVO_TPL_ADMIN_FORGOT_PASSWORD'),
            from: 'Acme Security <security@acme.io>',
            replyTo: 'security@acme.io',
          },
          // shorthand: a bare string is equivalent to { id }
          'email::users-permissions.reset-password': env('BREVO_TPL_RESET_PASSWORD'),
          'email::users-permissions.email-confirmation': {
            id: env('BREVO_TPL_EMAIL_CONFIRMATION'),
            params: { brandName: 'Acme' }, // static; generated payload wins on conflict
          },
        },
      },
    },
  },
});
```

Three reasons this belongs in config rather than in `core_store` behind an admin form:

- **Template ids are environment-scoped deployment artifacts.** The Brevo template id in staging
  is not the one in production. A DB-stored id is captured by a dump, promoted across environments
  by a restore, and drifts exactly the way the users-permissions `advanced` and `email` settings
  already drift — a known support pain, not a pattern worth extending. Being env-var-driven is
  what makes it deployable.
- **It is a privilege-escalation surface.** An admin-editable free-text "provider template id"
  lets anyone holding `plugin::users-permissions.email-templates.update` redirect the
  password-reset email to an arbitrary template in the organization's ESP account.
- **Boot-time validation becomes impossible.** The database is not readable at config-validation
  time, which pushes every misconfiguration to the first password reset in production.

#### Sender resolution on the remote path

Deliberately different from `send()`:

1. per-key `templates.keys[key].from`
2. call-site `options.from`
3. nothing — the provider-side template's own configured sender wins.

`settings.defaultFrom` is **not** auto-applied on the remote path, and neither is
`settings.defaultReplyTo`. The premise of provider-hosted templates is that the template, including
its sender identity and verified domain, is managed provider-side; injecting Strapi's `defaultFrom`
would override a correctly configured Brevo sender and cause DMARC failures.

This divergence needs documenting loudly, because it has a visible consequence: for a remote-backed
key, the users-permissions store's `from.name` and `from.email` — defaulting to
`Administration Panel <no-reply@strapi.io>` — are ignored. If review prefers the opposite default,
the escape hatch is a `templates.applyDefaultFrom` boolean.

### Payload contract v1

This is the part of the proposal that cannot be taken back, and it needs the most care.

**The remote payload is built by a dedicated pure mapper and is not the same object as the lodash
interpolation data.**

The tempting alternative — merge them, emit camelCase aliases alongside `URL` / `TOKEN` / `USER` —
is unsafe. Both render paths derive their interpolation allowlist _from the data object itself_:
`sendTemplatedEmail` calls `createStrictInterpolationRegExp(objects.keysDeep(data))`, and the
users-permissions `template` service does the same. Meanwhile `isValidEmailTemplate`, which guards
the admin save endpoint, validates against a **hardcoded** `authorizedKeys` array:
`URL`, `ADMIN_URL`, `SERVER_URL`, `CODE`, `USER`, `USER.email`, `USER.username`, `TOKEN`.

Widening the data desynchronizes the two: a user could write a template that renders fine at send
time but is rejected when saved from the admin panel. That asymmetry between what the validator
accepts and what the renderer executes is a validation-bypass smell, and it would be a fair thing
for a reviewer to block on.

So: **the local data stays byte-identical to today, and the remote payload is a separate,
normalized object.** No aliases, no widening, no change to `authorizedKeys`, no change to any
`createStrictInterpolationRegExp` call site. Zero breaking change, by construction.

Every key carries a common envelope:

```ts
interface CoreEmailPayloadMeta {
  templateKey: string; // e.g. 'email::users-permissions.reset-password'
  payloadVersion: 1;
  locale?: string; // best-effort; admin::user.preferedLanguage, otherwise undefined
  strapiVersion: string;
}
```

| Template key                                  | Remote payload v1                                                                                                       | Today's local variables                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `email::users-permissions.reset-password`     | `user` (`id`, `email`, `username`, `firstname`, `lastname`), `token`, `url`, `baseUrl`, `serverUrl`, `adminUrl`, `meta` | `URL` (base), `TOKEN`, `USER` (full sanitized entity), `SERVER_URL`, `ADMIN_URL` |
| `email::users-permissions.email-confirmation` | `user` (same five fields), `code`, `url`, `baseUrl`, `serverUrl`, `adminUrl`, `meta`                                    | `URL` (base), `CODE`, `USER` (full sanitized entity), `SERVER_URL`, `ADMIN_URL`  |
| `email::admin.forgot-password`                | `user` (`email`, `username`, `firstname`, `lastname`), `token`, `url`, `adminUrl`, `serverUrl`, `meta`                  | `url` (already built), `user` (already picked)                                   |

Three normalizations, each resolving an inconsistency that exists today:

- **`url` is always fully built and click-ready, on all three keys.** That is the whole point of a
  stable contract: a Brevo template author writes the link once. `baseUrl` plus `token` or `code`
  remain exposed for authors who compose their own. The stock local templates already perform this
  concatenation, so the built `url` matches what today's emails contain.
- **`user` is an explicit field allowlist, never the full sanitized entity.** users-permissions
  currently passes the entire `defaultSanitizeOutput` result, which includes every non-private
  field the project has added. Forwarding that to a third-party ESP as template parameters is PII
  egress that "sanitized for the API" does not authorize. Admin forgot-password already picks four
  fields; this aligns users-permissions to the stricter behavior rather than the reverse. Local
  rendering is unaffected and keeps the full `USER`.
- **camelCase throughout**, matching the admin key that already uses `url` and `user`.

Edge cases the mappers must handle:

- `advanced.email_reset_password` defaults to `null`. Today the local template renders the literal
  string `null?code=abc`. The mapper must emit `url: undefined`, `baseUrl: undefined` and warn once
  rather than propagate that string into a provider payload.
- `baseUrl` may already carry a query string, so `url` is built with the `URL` object and
  `searchParams.set`, not naive concatenation. This makes the remote link strictly more correct
  than the local one; that divergence should be documented rather than silently retrofitted into
  the local template.
- `firstname` and `lastname` do not exist on `plugin::users-permissions.user` by default. Emit
  `undefined` rather than `null` and let the template author handle absence.

**Versioning policy.** `meta.payloadVersion` is the stability commitment. Within v5, keys may be
_added_ only — never removed, renamed or retyped. A breaking change bumps the version and both
shapes are emitted for one minor release.

The mappers are exported **pure functions**, not inline object literals, because once the body
lives in Brevo they are the only unit-testable artifact left. See the testability note under
Tradeoffs.

### The shared send path

A new method on the email service, `sendRegisteredEmail(key, payload)`:

```ts
export interface RegisteredEmailPayload {
  /** Addressing. `from` / `replyTo` here are call-site defaults; per-key config overrides them. */
  options: EmailAddresses;
  /** Normalized, versioned remote payload. Ignored when no remote mapping exists. */
  data: Record<string, unknown>;
  /** Unrendered local template plus its legacy-named data. Rendered lazily, local path only. */
  fallback: {
    template: EmailTemplate; // subject / text / html
    data: Record<string, unknown>; // URL, TOKEN, CODE, USER, SERVER_URL, ADMIN_URL
  };
}
```

Resolution is two-branch:

- no config entry for `key` — delegate to the existing
  `sendTemplatedEmail(payload.options, payload.fallback.template, payload.fallback.data)`;
- entry present — call
  `provider.sendTemplate({ ...resolvedAddressing, template: { id, version }, data: { ...entry.params, ...payload.data } })`.

**`sendTemplatedEmail` is not modified at all.** Its `subject` / `text` / `html` requirement is not
"relaxed conditionally" — it is simply never reached on the remote branch, because the local branch
delegates to it and the remote branch does not. That matters: `sendTemplatedEmail` is public API
that third parties call directly, and loosening its validation would weaken an existing guarantee
for everyone in order to serve a case it never handles.

**The fallback is carried unrendered, so local rendering is lazy.** This is not a micro-optimization.
The users-permissions `template` service throws `ApplicationError` on a malformed template. Today
both users-permissions call sites render _before_ deciding anything, so a broken local body breaks
password reset even for an operator who has moved entirely to Brevo and does not care about the
local copy. With lazy rendering, an app fully on provider templates never executes lodash at all.

A small companion, `getTemplateConfig(key)`, returns the resolved entry or `undefined` and backs the
admin endpoints below.

### Failure semantics

| Situation                                                        | Behavior                                                                                                                                                                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Key has no config entry                                          | Local lodash rendering. Always. Zero config means zero behavior change — this is the compatibility guarantee.                                                                                         |
| `templates.keys` non-empty but provider has no `sendTemplate`    | Throw at startup, naming the provider and the offending keys.                                                                                                                                         |
| Configured `id` is empty or undefined                            | Throw at startup. A missing env var is the single most likely real-world misconfiguration, and catching it at boot instead of at the first password reset is the whole value of config-over-database. |
| Provider rejects the id at send time (404, unpublished, revoked) | Governed by `templates.onError`. Default `strict`: rethrow. Existing call-site handling then applies unchanged.                                                                                       |
| `onError: 'fallback'`                                            | Log at `error` level, render locally, send. Opt-in only.                                                                                                                                              |

Startup validation has a natural home: the `validator()` hook in
`packages/core/email/server/src/config.ts` exists and is currently an empty function.

**Why `strict` is the default.** A silent fallback sends a _different body_ than the operator
configured. If they moved to a Brevo template specifically to stop shipping the stock Strapi body,
a silent fallback undoes that decision without telling anyone. It also lets a permanently broken
template id go unnoticed indefinitely, and it switches the sending identity mid-flight from a
Brevo-verified sender to `defaultFrom` — a live DMARC and deliverability hazard.

The honest counter-argument: Strapi's existing culture leans the other way.
`sendConfirmationEmail` already swallows template errors, and admin forgot-password already catches
and logs. The distinction worth defending is that those swallow _delivery_ failures — the email
simply does not arrive — whereas a fallback substitutes a different email. This is nonetheless the
decision most likely to be flipped in review, which is exactly why `onError` exists: changing the
default is a one-line edit.

Two mitigations make `strict` survivable: boot-time validation, and a `templateKey` option on the
admin test-send endpoint so each configured key can be smoke-tested from the settings page before
shipping.

### REST and admin surfaces

**The content-API send route should not accept template references.** The existing
`.catchall(z.string())` is, by accident, a correct security boundary. The route is exposed to any
principal holding the corresponding users-permissions permission. Accepting a caller-supplied
template id and parameters would let that principal send _any_ template in the organization's ESP
account — including the password-reset template, with attacker-chosen parameters — to any recipient,
DKIM-signed by the project's domain. It is a turnkey phishing primitive, and it is not fixable by
validation, because the set of valid ids lives in Brevo rather than in Strapi.

If demand materializes later, the only safe shape is: accept a `templateKey` that must already
exist in `templates.keys` (never a raw provider id), gated by an explicit per-key
`allowPublicSend` defaulting to `false`, with `data` validated against a zod schema the application
author supplies. Future work; not proposed here.

**The admin test endpoint should accept an optional `templateKey`.** It already sits behind
`admin::isAuthenticatedAdmin` and `plugin::email.settings.read`, carries no request schema today,
and would only accept keys already present in config. Cheap, and it is the mitigation that makes a
`strict` default acceptable.

**`GET /email/settings`** gains a templates section:

```ts
export interface EmailSettings {
  config: ConfigSettings;
  supportsVerify: boolean;
  capabilities?: ProviderCapabilities;
  isIdle?: boolean;
  templates?: {
    supported: boolean; // typeof provider.sendTemplate === 'function'
    keys: Array<{ key: string; configured: boolean }>;
  };
}
```

Provider template **ids are not returned to the browser**. They are config values sourced from
environment variables, there is no UI need for them, and leaking config into the admin bundle is a
habit worth not forming.

The email settings page gains one read-only section beneath the existing capabilities block, plus a
`remote-templates` entry in the existing feature-label map so the capability chips light up
automatically. No new page, no new form.

**The users-permissions email-templates page needs a separate endpoint.** Its GET handler returns
the raw store value, and the admin page round-trips the entire object back through PUT, where the
update handler reads `options.message` for _every_ key. Adding any sibling key to the GET response
— `__meta`, `providerManaged`, anything — makes the next save throw a `TypeError`. So the signal
comes from a new `GET /users-permissions/email-templates/provider-status` behind the existing read
action, returning a per-template `providerManaged` boolean.

The template table then shows a "Managed by provider" badge and disables the edit button. If the
edit modal is reached anyway, the banner must state that **subject, body, and shipper name and
email are all ignored** for that template — that is the honest statement given the sender-resolution
rules above. Saving stays permitted through the API, so an operator can keep the local body
maintained as a fallback for a future `onError` switch or a provider migration.

### A Brevo provider

`packages/providers/email-brevo`, targeting Brevo's transactional endpoint
`POST /v3/smtp/email` with an `api-key` header:

```ts
async sendTemplate({ template, data, to, cc, bcc, from, replyTo, subject }: SendTemplateOptions) {
  const templateId = Number(template.id);

  if (!Number.isInteger(templateId)) {
    throw new Error(`Brevo template id must be an integer, received "${template.id}"`);
  }

  return post('/smtp/email', {
    templateId,
    to: toBrevoRecipients(to),
    cc: cc ? toBrevoRecipients(cc) : undefined,
    bcc: bcc ? toBrevoRecipients(bcc) : undefined,
    params: data,
    // Only set when explicitly resolved — otherwise Brevo's template sender wins.
    ...(from ? { sender: toBrevoAddress(from) } : {}),
    ...(replyTo ? { replyTo: toBrevoAddress(replyTo) } : {}),
    ...(subject ? { subject } : {}),
  });
}
```

`send` maps to the same endpoint with `sender`, `subject`, `htmlContent` and `textContent`, keeping
the existing `...rest` escape hatch for tags and custom headers. `verify` probes `/account`.

Four decisions worth reviewing:

- **No runtime dependency on `@getbrevo/brevo`.** `engines.node` is `>=20.0.0 <=26.x.x` across the
  provider packages, so global `fetch` is available. The official SDK is large and has had breaking
  churn; it would be the heaviest dependency in the provider set.
- **Address parsing stays local to the provider.** Brevo wants name/email objects where Strapi's
  contract is an RFC 5322 string, and `to` is comma-separated — so the splitter must respect quoted
  display names containing commas. Two RFC 5322 parsers already exist in the tree, and it is worth
  being precise about why neither is reusable here. `packages/core/email/shared/email-address-parser.ts`
  is consumed only by the admin settings page and is browser code, built on `atob` and `TextDecoder`.
  `packages/providers/email-nodemailer/src/utils/email-address.ts` is the Node counterpart, built on
  `Buffer`, and has since diverged — it adds RFC 5321 normalization and stricter validation. They are
  a deliberate runtime split, not accidental duplication, and no single module can replace both.

  Promoting either into `@strapi/utils` would not help: that package pulls in `execa`,
  `node-machine-id` and `preferred-pm`, no admin bundle in the monorepo imports it, and
  `email-nodemailer` does not depend on it today. Provider packages are published and versioned
  independently and none of them imports a `@strapi/*` module in `src/` at all.

  Brevo also needs far less than either parser offers: split a recipient list, and extract a display
  name and address. It does not need RFC 2047 decoding, since parameters are sent as UTF-8 JSON. So
  the provider ships a small local helper covering exactly that, and the broader consolidation of the
  two existing parsers is left alone — it is a separate concern from this RFC, and one that has to
  resolve the browser/Node split before it can be a single module.

- **Error surfacing.** Brevo returns a 400 with a code and message for an unknown template id. Map
  it to an `Error` carrying `statusCode` so the existing branch in the email controller continues
  to convert it into an `ApplicationError`.
- **Scaffolding mirrors `email-sendgrid`** — rollup config, build and base tsconfig, the standard
  script set, tests following the `email-amazon-ses` layout. The package is picked up automatically
  by the existing workspace glob.

### Rollout

**No future flag.** Future flags are for unstable or unshipped features and opt-in breaking changes,
surfaced through `config/features.ts` and `strapi.future.isEnabled()`. This feature is already gated
by configuration: absent `templates.keys`, no new behavior executes. A flag would be a redundant
second switch and would require widening the typed feature union in `@strapi/types` for no benefit.

The thing that genuinely cannot be taken back is the payload contract, and a flag does not protect
it — people would build Brevo templates against the flagged shape regardless. The cheap hedge, if
the team wants one: ship with v1 documented as "may change in a minor for one release", then freeze.

### Implementation outline

0. **Type split.** Extract `EmailAddresses` in the email plugin's `types.ts`. Blocks everything
   else; nothing compiles against an index signature otherwise.
1. **Core plumbing.** `types.ts`, a new `constants.ts`, `sendRegisteredEmail` and
   `getTemplateConfig` in `services/email.ts`, `sendTemplate` on the interface plus startup
   validation in `bootstrap.ts`, a real `validator()` in `config.ts`, and service tests.
   `sendTemplatedEmail` is untouched.
2. **The Brevo provider** under `packages/providers/email-brevo`.
3. **Migrate the three call sites,** plus new pure mappers under
   `packages/plugins/users-permissions/server/src/utils/`. Two notes: the admin auth service tests
   currently stub `send` and `sendTemplatedEmail` and must also stub `sendRegisteredEmail`; and
   `sendConfirmationEmail` should stop mutating its settings object in place, since that object
   comes from the plugin store.
4. **Admin UI.** The shared `EmailSettings` type, `getSettings` and `test` in the email controller,
   the email settings page, the new users-permissions status route and handler, the template table
   and form, and translations. The existing `getEmailTemplate` and `updateEmailTemplate` handlers
   are not touched.
5. **More providers.** `sendTemplate` for SendGrid (`templateId` plus `dynamicTemplateData`) and
   Mailgun (`template` plus `h:X-Mailgun-Variables`). Amazon SES is **explicitly out of scope**: it
   needs `SendTemplatedEmailCommand`, a different command class from the `SendEmailCommand` the
   provider currently builds, with provider-stored subjects and its own placeholder syntax.
6. **Documentation** for the email plugin and provider pages. The payload contract table is the
   deliverable.

## Example

A Brevo template, authored in Brevo's editor and published as template id `42`:

```html
<p>Hi {{ params.user.firstname | default: params.user.username }},</p>
<p>Use the link below to reset your password:</p>
<p><a href="{{ params.url }}">Reset my password</a></p>
```

Wired up in `config/plugins.ts`:

```ts
export default ({ env }) => ({
  email: {
    config: {
      provider: 'brevo',
      providerOptions: { apiKey: env('BREVO_API_KEY') },
      templates: {
        keys: {
          'email::users-permissions.reset-password': env('BREVO_TPL_RESET_PASSWORD'), // "42"
        },
      },
    },
  },
});
```

A user requests a password reset. `sendRegisteredEmail` finds an entry for the key, skips local
rendering entirely, and the provider issues:

```json
{
  "templateId": 42,
  "to": [{ "email": "ada@example.com", "name": "ada" }],
  "params": {
    "user": { "id": 7, "email": "ada@example.com", "username": "ada" },
    "token": "5f1c...e90",
    "url": "https://acme.io/reset-password?code=5f1c...e90",
    "baseUrl": "https://acme.io/reset-password",
    "serverUrl": "https://api.acme.io",
    "adminUrl": "https://api.acme.io/admin",
    "meta": {
      "templateKey": "email::users-permissions.reset-password",
      "payloadVersion": 1,
      "strapiVersion": "5.47.1"
    }
  }
}
```

The sender is Brevo's own configured template sender, because no per-key `from` was set. Remove the
`keys` entry and the same request renders the local lodash template and sends exactly as it does
today.

## Tradeoffs

- **Two data bags.** `RegisteredEmailPayload` carrying both `data` and `fallback.data` is the least
  elegant part of this design and will invite "why not one object?". The answer is the validation
  asymmetry described under the payload contract, and it belongs in the prose rather than being
  rediscovered in review.
- **Availability versus integrity.** Under `strict`, a typo'd template id breaks password reset
  entirely. That is the cost of never silently substituting a different body, mitigated by boot-time
  validation and per-key test sends.
- **Multi-locale is not solved.** Brevo and SendGrid have one template per id with no built-in locale
  switch. `plugin::users-permissions.user` has no locale field at all; `admin::user` has
  `preferedLanguage`. v1 emits a best-effort `meta.locale` so a single template can branch
  internally, and `RemoteTemplateConfig` is an object specifically so a `locales` map can be added
  non-breakingly. Anyone needing per-locale templates today must branch inside the provider
  template. This should be stated plainly rather than implied away.
- **The plaintext part moves to the provider.** Brevo and SendGrid auto-generate it. A slight loss
  of control, but in practice an improvement: both users-permissions call sites currently ship the
  HTML body verbatim as the `text` part, a genuine pre-existing deliverability defect that this
  change incidentally fixes for remote-backed templates.
- **Testability regresses.** With no local body there is nothing to snapshot; end-to-end tests can
  only assert that the provider received the expected template id and parameters. That is precisely
  why the payload mappers are extracted as pure functions — they become the only unit-testable
  artifact, and the contract table becomes the test oracle.
- **Config-over-database costs a redeploy** to change a template id. Accepted: it is the right
  tradeoff for an environment-scoped artifact, and the template _content_ — the thing that actually
  changes often — is edited in Brevo with no Strapi involvement at all.
- **Provider fragmentation.** Only Brevo ships with `sendTemplate` initially; `sendmail`, the default
  provider, and `nodemailer` will never have it, since provider-hosted templates are meaningless over
  raw SMTP. Boot-time validation turns that into a clear error rather than a confusing one, but
  "why doesn't this work with nodemailer" will be a recurring support question.
- **Sender divergence.** The remote path deliberately ignores `settings.defaultFrom` and the
  users-permissions store's configured shipper. Correct for DMARC, surprising for users, and the
  reason the admin banner must name all three ignored fields rather than only the body.

## Alternatives

### A) A reserved structured field on `send()`

No new provider method: pass `template` and `templateData` inside the existing `SendOptions` and let
providers pick them up from the `...rest` they already spread.

Rejected on three counts. The `EmailOptions` index signature makes a structured `template` field
untypable without the same type split, so it saves nothing. There is no way to _detect_ support:
core cannot distinguish "the provider will handle this key" from "the provider will blindly spread
an unknown key into a vendor payload and receive a 400", which makes fail-fast startup validation
and the strict/fallback logic unimplementable. And it silently changes the meaning of a key inside
an object that today passes through untouched — Mailgun already uses `template` as its own field
name.

### B) A `strapi.emailTemplates` registry

Plugins register a key and a payload schema during `register()`; core validates payloads and the
admin panel enumerates the registry.

Rejected on complexity. A registry module, container wiring, `Core.Strapi` type surface, lifecycle
ordering rules and an admin endpoint — all to gain enumeration that `Object.keys` already provides.
The schema validation is illusory, since the authoritative schema is the template in the provider.

### C) Template ids in the plugin store, edited from the admin panel

The most discoverable option, and no redeploy needed to change a template.

Rejected: ids are environment-scoped and belong in environment variables, not in a database row that
gets promoted across environments by a dump and restore. It converts a settings page into a control
that can redirect transactional email to an arbitrary template in the ESP account, reachable by any
panel user holding the update permission. And it makes boot-time validation impossible, pushing the
failure to the first password reset in production.

### D) One merged data bag with camelCase aliases

Keep a single data object, emit both legacy and normalized names, let old templates keep working.

Rejected: it silently widens the strict interpolation allowlist on both render paths while the
`authorizedKeys` array that guards the admin save endpoint stays fixed, desynchronizing what the
validator accepts from what the renderer executes. It also forces the full sanitized user entity into
the provider payload, since one object would have to serve both purposes.

### E) Strapi as source of truth, syncing bodies up to the provider

Render locally and push the body to the provider, treating the provider as a cache. Keeps one
template source and preserves the admin editor.

Rejected: it inverts the premise. The point of provider-hosted templates is that design and marketing
own them in the provider's visual editor, with that provider's versioning, preview and approval
workflow. It would also require write-scoped API credentials, a sync lifecycle, drift detection and
conflict resolution when someone edits in Brevo. Considerably more machinery for a worse outcome.

## Resources

- [RFC template](./example.md) and the [contributing guide](https://github.com/strapi/strapi/blob/main/CONTRIBUTING.md) RFC section
- [Brevo transactional email API](https://developers.brevo.com/reference/sendtransacemail)
- [SendGrid dynamic transactional templates](https://www.twilio.com/docs/sendgrid/ui/sending-email/how-to-send-an-email-with-dynamic-templates)
- [Mailgun templates](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/#templates)
- [Amazon SES templated email](https://docs.aws.amazon.com/ses/latest/APIReference/API_SendTemplatedEmail.html)
