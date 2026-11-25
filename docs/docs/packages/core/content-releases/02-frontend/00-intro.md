---
title: Introduction
description: 'Introduction to content releases frontend implementation and features.'
tags:
  - tech-design
  - frontend
status: stub
---

## Summary

There are two pages, ReleasesPage and ReleaseDetailsPage. To access these pages a user will need a valid Strapi license with the feature enabled and at least `plugin::content-releases.read` permissions.

Redux toolkit is used to manage content releases data (data retrieval, release creation and editing, and fetching release actions). `Formik` is used to create/edit a release and all input components are controlled components.

### License limits

Most licenses have feature-based usage limits configured through Chargebee. These limits are exposed to the frontend through [`useLicenseLimits`](../../admin/ee/hooks/use-license-limits.md).
If the license doesn't specify the number of maximum pending releases a hard-coded default is used: max. 3 pending releases.

### Endpoints

For a list of all available endpoints please refer to the [detailed backend design documentation](../01-backend.md).
