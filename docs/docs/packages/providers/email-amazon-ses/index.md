---
title: '@strapi/provider-email-amazon-ses'
sidebar_label: 'email-amazon-ses'
description: 'Amazon SES provider for strapi email'
package: '@strapi/provider-email-amazon-ses'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Connects Strapi to Amazon SES to send transactional emails. The email plugin loads this provider when configured with `provider: 'amazon-ses'`. Use it in production environments that are already on AWS and need integration with SES as their mail service.

## Key concepts

- Implements the email provider interface: `init(providerOptions, settings)` returns an object with `send(options)` and optional `verify()`, `isIdle()`, `close()`, and `getCapabilities()` methods.
- Reads `providerOptions` keys: `region` (optional, AWS region for credentials).
- Uses AWS SDK v3 SES client; credentials resolve from standard AWS credential chain (environment variables, IAM roles, credentials file).
- Supports the full `SendEmailCommand` interface for addressing, content, and headers via the `send` function.
- Source: [github.com/strapi/strapi/tree/develop/packages/providers/email-amazon-ses](https://github.com/strapi/strapi/tree/develop/packages/providers/email-amazon-ses)

## Related

- [Email plugin](../../core/email/index.md)
- [Sendgrid provider](../email-sendgrid/index.md)
- [Nodemailer provider](../email-nodemailer/index.md)
