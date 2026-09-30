---
title: '@strapi/logger'
sidebar_label: 'logger'
description: "Strapi's logger built with Winston"
package: '@strapi/logger'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides the logging system for Strapi applications. Built on Winston, it offers configurable log levels, formats (pretty-print, detailed, filtered), and outputs (console, file). Strapi app developers use it; it is not a direct dependency outside the framework.

## Key concepts

- **Winston-based**: Exports `createLogger()` factory and re-exports Winston types. Wraps Winston configuration with Strapi defaults. See [index.ts](https://github.com/strapi/strapi/tree/develop/packages/utils/logger).
- **Configurable formats**: Includes pretty-print (readable), detailed (timestamp/level), exclude-colors, log-errors, and level-filter formats. Compose them for different environments.
- **Output configuration**: Default console output; file output via `output-file-configuration` for logging to disk.

## Related
