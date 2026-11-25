---
title: 'api-tests'
sidebar_label: 'api-tests'
description: 'Testing utilities for API integration tests'
package: 'api-tests'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides utilities for API integration tests in the Strapi monorepo. Used by the test suite to create Strapi instances, set up authentication, define test data models, and make API requests using supertest.

## Key concepts

- **Strapi instance factory**: `createStrapiInstance()` creates a test instance with bootstrap hooks, super admin setup, and session configuration. See [strapi.js](https://github.com/strapi/strapi/tree/develop/packages/utils/api-tests).
- **Test utilities**: Helpers for supertest requests, authentication, model generation, and mock fetch. Extends supertest with Strapi-specific convenience methods.
- **Used by**: The API integration tests in `tests/api/` for all database backends (SQLite, PostgreSQL, MySQL).

## Related

- [Testing](../../../contributing/03-testing/index.md): guide to running all test suites.
