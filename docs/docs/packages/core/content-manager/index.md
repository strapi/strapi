---
title: '@strapi/content-manager'
sidebar_label: 'content-manager'
description: 'Strapi plugin with the admin panel list, edit and configuration views, and the admin API routes behind them, for managing documents.'
package: '@strapi/content-manager'
status: needs-review
review_notes:
  - 'Says the Content Manager lives in `@strapi/admin` and will become its own plugin in v5; `@strapi/content-manager` now exists.'
---

## Purpose

The content-manager is a plugin that allows users to write / update & delete their content, it's currently held within the `@strapi/admin` package, but from V5 will be removed back to its own plugin. At its very basic form, the CM is just a table & a few forms. There are a few public APIs to manipulate these forms & tables as well as some universal hooks exported for user's to additionally interact with within their own plugins outside of the CM plugin & within.
