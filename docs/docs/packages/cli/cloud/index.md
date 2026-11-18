---
title: '@strapi/cloud-cli'
sidebar_label: 'cloud'
description: 'CLI commands for Strapi Cloud interactions'
package: '@strapi/cloud-cli'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides CLI commands for Strapi app developers to manage Strapi Cloud projects, deployments, and environments. Integrated into the main Strapi CLI.

## Key concepts

- **Cloud commands**: `deployProject`, `link`, `login`, `logout`, `createProject`, `listProjects`, `listEnvironments`, `linkEnvironment`. See [index.ts](https://github.com/strapi/strapi/tree/develop/packages/cli/cloud).
- **Command builder**: `buildStrapiCloudCommands()` adds cloud subcommands to the Commander command object at startup.
- **Config management**: Local config stores installation ID and authentication state. Services handle API calls to Strapi Cloud backend.

## Related

- [Testing](../../../contributing/03-testing/index.md): CLI test infrastructure.
