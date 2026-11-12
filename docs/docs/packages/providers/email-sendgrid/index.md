---
title: '@strapi/provider-email-sendgrid'
sidebar_label: 'email-sendgrid'
description: 'Sendgrid provider for strapi email'
package: '@strapi/provider-email-sendgrid'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Connects Strapi to Sendgrid to send transactional emails. The email plugin loads this provider when configured with `provider: 'sendgrid'`. Use it when your team uses Sendgrid for email delivery and wants to integrate it with Strapi.

## Key concepts

- Implements the email provider interface: `init(providerOptions, settings)` returns an object with `send(options)` method.
- Reads `providerOptions` keys: `apiKey` (required), `region` (optional, `'eu'` or `'global'` for data residency).
- Supports Sendgrid Mail API v3; uses official `@sendgrid/mail` SDK and configures data residency when specified.
- Accepts standard email fields: from, to, cc, bcc, replyTo, subject, text, html, and passthrough custom fields.
- Source: [github.com/strapi/strapi/tree/develop/packages/providers/email-sendgrid](https://github.com/strapi/strapi/tree/develop/packages/providers/email-sendgrid)

## Related

- [Email plugin](../../core/email/index.md)
- [Amazon SES provider](../email-amazon-ses/index.md)
- [Nodemailer provider](../email-nodemailer/index.md)
