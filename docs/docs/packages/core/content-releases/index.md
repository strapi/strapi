---
title: '@strapi/content-releases'
sidebar_label: 'content-releases'
description: 'Strapi plugin for organizing and releasing content'
package: '@strapi/content-releases'
status: draft
---

## Purpose

A release contains various content entries, each capable of being assigned a specific action such as publish or unpublish. Within a release, entries may be in different locales or come from different content types. With a simple click of a button, a release can execute the designated action for each entry. Content Releases is an enterprise edition feature.

## Key concepts

### Release's status

Releases are assigned one of five statuses:

- **Ready**: Indicates that the release is fully prepared for publishing, with no invalid entries present.
- **Blocked**: Release has at least one invalid entry preventing publishing.
- **Empty**: Release contains no entries and cannot be published.
- **Failed**: Indicates that the publishing attempt for the release has encountered an error with no changes since then.
- **Done**: Confirms that the release has been successfully published without encountering any errors.

These statuses are dynamically updated based on actions such as creation, addition/removal of entries, updates, and publishing attempts. They provide a concise overview of release readiness and validity, ensuring smooth operations and data integrity.

### Built as a plugin

Most EE features live in the [EE folders](../../../architecture/09-enterprise-edition.md) of their package. Releases is built as its own plugin instead.
