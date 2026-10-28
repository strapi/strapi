---
title: '@strapi/provider-email-mailgun'
sidebar_label: 'email-mailgun'
description: 'Mailgun provider for strapi email plugin'
package: '@strapi/provider-email-mailgun'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Connects Strapi to Mailgun to send transactional emails. The email plugin loads this provider when configured with `provider: 'mailgun'`. Use it when your email infrastructure is hosted on Mailgun.

## Key concepts

- Implements the email provider interface: `init(providerOptions, settings)` returns an object with `send(options)` method.
- Reads `providerOptions` keys: `key` (required, API key), `domain` (required, Mailgun domain for sending), and other `MailgunClientOptions` passed to the Mailgun client.
- Uses the official Mailgun SDK with form-data multipart encoding; assertions check that both key and domain are supplied.
- Accepts email fields: from, to, cc, bcc, replyTo, subject, text, html, plus custom passthrough fields (e.g. Mailgun templates).
- Source: [github.com/strapi/strapi/tree/develop/packages/providers/email-mailgun](https://github.com/strapi/strapi/tree/develop/packages/providers/email-mailgun)

## Related

- [Email plugin](../../core/email/index.md)
- [Sendgrid provider](../email-sendgrid/index.md)
- [Nodemailer provider](../email-nodemailer/index.md)
