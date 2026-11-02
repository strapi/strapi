---
title: '@strapi/upgrade'
sidebar_label: 'upgrade'
description: 'CLI tool to upgrade Strapi applications'
package: '@strapi/upgrade'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides a CLI tool for Strapi app developers to upgrade between versions. Updates package.json, runs the package installer, and applies code transforms for breaking changes. Available via `npx @strapi/upgrade`.

## Key concepts

- **Version commands**: `latest`, `major`, `minor`, `patch` for upgrading to specific release tracks, and `to <version>` to pin a version. `codemods` runs transforms without upgrading. See [README](https://github.com/strapi/strapi/blob/develop/packages/utils/upgrade/README.md).
- **Package management**: Updates dependencies, installs them, and runs registry-aware upgrades (respects `min-release-age` policies).
- **Code transforms**: Applies available codemods for breaking changes in major versions.

## Related
