---
title: '@strapi/admin-test-utils'
sidebar_label: 'admin-test-utils'
description: 'Setup and fixtures for testing the admin panel'
package: '@strapi/admin-test-utils'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides test environment setup, fixtures, and utilities for Strapi admin panel tests. Used internally by the monorepo to configure Jest, mock Node globals, and supply realistic test data.

## Key concepts

- **Jest setup**: Environment setup, global test configuration, and Jest patches for DOM, fetch, and request stashing. Exports via multiple entry points: `.`, `/after-env`, `/environment`, `/file-mock`, `/global-setup`. See [src/](https://github.com/strapi/strapi/tree/develop/packages/admin-test-utils/src).
- **Test fixtures**: Pre-built data for collection types, permissions, and metadata (admin, content-manager, content-type-builder, documentation).
- **Node patches**: Globals, types, response/request body patches for test compatibility.

## Related

- [Testing](../../contributing/03-testing/index.md): front-end test execution.
