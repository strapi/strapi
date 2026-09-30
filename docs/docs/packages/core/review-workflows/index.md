---
title: '@strapi/review-workflows'
sidebar_label: 'review-workflows'
description: 'Enterprise plugin that adds workflow stages and assignees to content entries, with stage-based permissions.'
package: '@strapi/review-workflows'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
  - The Backend page still lists `packages/core/admin/ee` paths. The code is in `packages/core/review-workflows/server/src`.
---

## Purpose

`@strapi/review-workflows` lets a team track the review state of content. An administrator defines workflows. A workflow has ordered stages, for example "To do" or "Reviewed", and content types are assigned to it. Each entry of such a content type has a stage and an optional assignee.

The package is an Enterprise Edition plugin. It has a server part (`strapi-server`) and an admin part (`strapi-admin`). The plugin loader always enables it, and the EE license decides whether it is active. `@strapi/strapi` depends on it and bundles its admin part. Application developers do not import from it.

## Key concepts

### Enterprise gating

`server/src/index.ts` returns the full plugin only when `strapi.ee.features.isEnabled('review-workflows')` is true. Otherwise it returns only the content types, so that the data survives a downgrade. The admin routes use `enableFeatureMiddleware('review-workflows')`. The admin part registers its UI only when `window.strapi.features.isEnabled('review-workflows')` is true. See [Enterprise Edition](../../../architecture/09-enterprise-edition.md).

### Workflow and stage content types

`plugin::review-workflows.workflow` has a unique `name`, its `stages`, an optional `stageRequiredToPublish` and a JSON list `contentTypes`. `plugin::review-workflows.workflow-stage` has a `name`, a `color`, its `workflow` and a many-to-many relation `permissions` to `admin::permission`. Both are hidden from the content manager. On the first boot, `bootstrap` creates a workflow named "Default" with four stages when the database has none.

### Stage and assignee attributes

In `register`, `extendReviewWorkflowContentTypes` adds two one-to-one relations to every content type that is visible in the content manager: `strapi_stage` and `strapi_assignee`. The relations use a join table. An `afterSync` hook persists these join tables, so that the data survives a downgrade to the Community Edition. See [Extension points](../../../architecture/04-extension-points.md).

### Document Service middlewares

Three middlewares in `services/document-service-middleware.ts` connect the workflow to the write path. `assignStageOnCreate` sets the first stage on `create` and `clone`. `handleStageOnUpdate` emits the `review-workflows.updateEntryStage` event when the stage changes. `checkStageBeforePublish` rejects `publish` when the entry is not at `stageRequiredToPublish`. See [Document write path](../../../architecture/05-document-write-path.md).

### Stage permissions

A role can change the stage of an entry only with the `admin::review-workflows.stage.transition` permission. The permission has a parameter: `to` for the target stage, or `from` for the source stage. The `stage-permissions` service writes these parametrized permissions to roles and checks them. The super admin role always passes the check. The settings pages use the actions `admin::review-workflows.create`, `read`, `update` and `delete`. See [`@strapi/permissions`](../permissions/index.md).

### Workflow assignment and limits

The `workflows` service creates and updates workflows. The `workflow-content-types` service moves the entries of a content type to a stage when the content type changes workflow, and updates the content manager configuration. The `validation` service applies the limits `numberOfWorkflows` and `stagesPerWorkflow`. The license feature options set them, and the default is 200 each.

### Admin part

The admin entry adds the Review Workflows settings page, a column and a filter in the content manager list view, a side panel with the stage and assignee selects in the edit view, and the "Assigned to me" homepage widget. See [Settings](./02-settings.md), [Content manager](./03-content-manager.md) and [Backend](./01-backend.md).

## Related

- [Enterprise Edition](../../../architecture/09-enterprise-edition.md): how the license gates this plugin.
- [Schema sync](../../../architecture/07-schema-sync.md): the `beforeSync` and `afterSync` hooks. This package adds `afterSync` handlers.
- [Document write path](../../../architecture/05-document-write-path.md): where the three middlewares run.
- [`@strapi/permissions`](../permissions/index.md): the parametrized actions that stage transitions use.
- [`@strapi/admin`](../admin/index.md): admin users, roles and permissions that the stages rely on.
- [`@strapi/content-manager`](../content-manager/index.md): hosts the list view hooks and the edit view panel.
