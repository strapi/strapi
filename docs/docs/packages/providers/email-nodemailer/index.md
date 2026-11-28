---
title: '@strapi/provider-email-nodemailer'
sidebar_label: 'email-nodemailer'
description: 'Nodemailer provider for Strapi'
package: '@strapi/provider-email-nodemailer'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Connects Strapi to any SMTP relay using Nodemailer. The email plugin loads this provider when configured with `provider: 'nodemailer'`. Use it for custom SMTP setups, Gmail, office email, or any service with SMTP access.

## Key concepts

- Implements the email provider interface: `init(providerOptions, settings)` returns an object with `send(options)`, optional `verify()`, `isIdle()`, `close()`, and `getCapabilities()` methods.
- Reads `providerOptions`: any valid Nodemailer transport configuration (host, port, secure, auth, pool, maxConnections, proxy, rateLimit, DKIM, etc.).
- Supports comprehensive email options: standard fields (from, to, cc, bcc, replyTo, subject, text, html), plus attachments, alternatives, headers, priority, threading (inReplyTo/references), encoding, calendar events (icalEvent), mailing list support, DKIM signing, OAuth2 authentication per-message.
- Blocks file and URL access to prevent local file inclusion or SSRF via attachment sources (disableFileAccess, disableUrlAccess always enforced).
- Source: [github.com/strapi/strapi/tree/develop/packages/providers/email-nodemailer](https://github.com/strapi/strapi/tree/develop/packages/providers/email-nodemailer)

## Related

- [Email plugin](../../core/email/index.md)
- [Amazon SES provider](../email-amazon-ses/index.md)
- [Sendgrid provider](../email-sendgrid/index.md)
- [Sendmail provider](../email-sendmail/index.md)
