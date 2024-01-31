---
title: Introduction
tags:
  - content-releases
  - tech design
---

## Summary

Two primary views, List and Details, empower users to effectively oversee content releases. Access to these views is exclusive to the enterprise mode, requiring users to hold the specific permission `plugin::content-releases.read`.

Redux toolkit is used to manage content releases data (data retrieval, release creation and editing, and fetching release actions). `Formik` is used to create/edit a release and all input components are controlled components.

### License limits

Most licenses have feature-based usage limits configured through Chargebee. These limits are exposed to the frontend through [`useLicenseLimits`](/docs/core/admin/ee/hooks/use-license-limits).
If the license doesn't specify the number of maximum pending releases an hard-coded is used: max. 3 pending releases.

### Endpoints

For a list of all available endpoints please refer to the [detailed backend design documentation](/docs/core/content-releases/backend).
