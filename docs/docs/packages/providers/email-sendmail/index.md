---
title: '@strapi/provider-email-sendmail'
sidebar_label: 'email-sendmail'
description: 'Sendmail provider for strapi email'
package: '@strapi/provider-email-sendmail'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Connects Strapi to a local sendmail or SMTP server to send transactional emails. The email plugin loads this provider when configured with `provider: 'sendmail'`. Use it in on-premises or legacy deployments with direct SMTP or sendmail access. Nodemailer is recommended for most production setups.

## Key concepts

- Implements the email provider interface: `init(providerOptions, settings)` returns an object with `send(options)` method.
- Reads `providerOptions` keys: `silent` (optional, default true), `dkim` (optional, boolean or object with privateKey/keySelector), `smtpPort` (optional, default 25), `smtpHost` (optional, extra SMTP host), `devPort`/`devHost` (optional, for development), `rejectUnauthorized`, `autoEHLO`, and `logger` (optional, custom logger functions).
- Connects directly to SMTP or sendmail; resolves MX records unless dev mode is enabled. DKIM signing is optional.
- Accepts email fields: from, to, cc, bcc, replyTo, subject, text, html, plus custom passthrough fields.
- Source: [github.com/strapi/strapi/tree/develop/packages/providers/email-sendmail](https://github.com/strapi/strapi/tree/develop/packages/providers/email-sendmail)

## Related

- [Email plugin](../../core/email/index.md)
- [Nodemailer provider](../email-nodemailer/index.md)
- [Amazon SES provider](../email-amazon-ses/index.md)
