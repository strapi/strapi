---
title: Review Workflows
description: Review workflow technical design
tags:
  - review-workflows
  - implementation
  - tech design
---

# Review Workflows

## Summary

The review workflow feature is only available in the Enterprise Edition.
That is why, in part, it is completely decoupled from the code of the Community Edition.

The purpose of this feature is to allow users to assign a tag to the various entities of their Strapi project. This tag is called a 'stage' and is available within what we will call a workflow.

## Detailed backend design

The Review Workflow feature have been built with one main consideration, to be decoupled from the Community Edition. As so, the implementation can relate a lot to how a plugin would be built.

All the backend code related to Review Workflow can be found in `packages/core/admin/ee`.
This code is separated into several elements:

- Content-types
  - _strapi_workflows_: `packages/core/admin/ee/server/content-types/workflow/index.js`
  - _strapi_workflows_stages_: `packages/core/admin/ee/server/content-types/workflow-stage/index.js`
- Controllers
  - _workflows_: `packages/core/admin/ee/server/controllers/workflows/index.js`
  - _stages_: `packages/core/admin/ee/server/controllers/workflows/stages/index.js`
  - _assignees_: `packages/core/admin/ee/server/controllers/workflows/assignees/index.js`
- Middlewares
  - [_DEPRECATED_] _contentTypeMiddleware_: `packages/core/admin/ee/server/middlewares/review-workflows.js`
- Routes
  - `packages/core/admin/ee/server/routes/index.js`
- Services
  - _review-workflows_: `packages/core/admin/ee/server/services/review-workflows/review-workflows.js`
  - _workflows_: `packages/core/admin/ee/server/services/review-workflows/workflows.js`
  - _stages_: `packages/core/admin/ee/server/services/review-workflows/stages.js`
  - _metrics_: `packages/core/admin/ee/server/services/review-workflows/metrics.js`
  - _weekly-metrics_: `packages/core/admin/ee/server/services/review-workflows/weekly-metrics.js`
  - _validation_: `packages/core/admin/ee/server/services/review-workflows/validation.js`
  - _assignees_: `packages/core/admin/ee/server/services/review-workflows/assignees.js`
  - _stage-permissions_: `packages/core/admin/ee/server/services/review-workflows/stage-permissions.js`
- Utils file
  - _Review workflows utils_: `packages/core/admin/ee/server/utils/review-workflows.js`
- A bootstrap and a register part
  - `packages/core/admin/ee/server/bootstrap.js`
  - `packages/core/admin/ee/server/register.js`

### Content types

#### strapi_workflows

This content type stores the workflow information and is responsible for holding all the information about stages and their order. In MVP, only one workflow is stored inside the Strapi database.

#### strapi_workflows_stages

This content type store the stage information such as its name.

### Controllers

#### workflows

Used to interact with the `strapi_workflows` content-type.

#### stages

Used to interact with the `strapi_workflows_stages` content-type.

#### assignees

Used to interact with the `admin_users` content-type entities related to review workflow enabled content types.

### Middlewares

#### contentTypeMiddleware - _DEPRECATED_

In order to properly manage the options for content-type in the root level of the object, it is necessary to relocate the `reviewWorkflows` option within the `options` object located inside the content-type data. By doing so, we can ensure that all options are consistently organized and easily accessible within their respective data structures. This will also make it simpler to maintain and update the options as needed, providing a more streamlined and efficient workflow for developers working with the system. Therefore, it is recommended to move the reviewWorkflows option to its appropriate location within the options object inside the content-type data before sending it to the admin API.

### Routes

The Admin API of the Enterprise Edition includes several routes related to the Review Workflow feature. Here is a list of those routes:

#### GET `/review-workflows/workflows`

This route returns a list of all workflows.

#### POST `/review-workflows/workflows`

This route creates a new workflow.

#### GET `/review-workflows/workflows/:id`

This route returns the details of a specific workflow identified by the id parameter.

#### PUT `/review-workflows/workflows/:id`

This route updates a specific workflow identified by the id parameter.

#### DELETE `/review-workflows/workflows/:id`

This route deletes a specific workflow identified by the id parameter.

#### GET `/review-workflows/workflows/:workflow_id/stages`

This route returns a list of all stages associated with a specific workflow identified by the workflow_id parameter.

#### GET `/review-workflows/workflows/:workflow_id/stages/:id`

This route returns the details of a specific stage identified by the id parameter and associated with the workflow identified by the workflow_id parameter.

#### PUT `/review-workflows/workflows/:workflow_id/stages`

This route updates the stages associated with a specific workflow identified by the workflow_id parameter. The updated stages are passed in the request body.

#### PUT `/content-manager/(collection|single)-types/:model_uid/:id/stage`

This route updates the stage of a specific entity identified by the id parameter and belonging to a specific collection identified by the model_uid parameter. The new stage value is passed in the request body.

#### GET `/content-manager/(collection|single)-types/:model_uid/:id/stages`

Returns a list of stages that a user has permission to transition into (based on the permission settings of a stage).

#### PUT `/content-manager/(collection|single)-types/:model_uid/:id/assignee`

This route updates the assignee of the entity identified by the model_uid and id parameters. The updated entity is passed to the request body.

### Services

The Review Workflow feature of the Enterprise Edition includes several services to manipulate workflows and stages. Here is a list of those services:

#### review-workflows

This service is used during the bootstrap and register phases of Strapi. Its primary responsibility is to migrate data on entities as needed and add the stage field to the entity schemas.

#### workflows

This service is used to manipulate the workflows entities. It provides functionalities to create, retrieve, and update workflows.

#### stages

This service is used to manipulate the stages entities and to update stages on other entities. It provides functionalities to create, retrieve, update, and delete stages.

#### metrics

This is the telemetry service used to gather information on the usage of this feature. It provides information on the number of workflows and stages created, as well as the frequency of stage updates on entities.

#### weekly-metrics

Once a week we report on review workflows usage statistic. This service is used to set up the cron job responsible for gathering and sending statistics on: number of active workflows, average number of stages in a workflow, maximum number of stages across all workflows and the content types on which review workflows is activated.

#### assignees

This service is used to interact with admin user assignee relations on review workflow enabled content types. It provides the ability to: find the Id of an entity assignee, update and delete (unassign) the assignee on an entity.

#### stage-permissions

This service is used to enable RBAC functionality for review workflow stages. Each entry of the `strapi_workflows_stages` has a manyToMany relation with `admin_permissions`. The permissions held in this relation indicate which roles can change the review stage of an entry in this stage. The service provides the ability to: register and unregister new stage permissions based on stage and role Ids and to find out whether a role can transition from a given stage.

#### validation

This service is used to ensure the feature is working as expected and validate the data to be valid.

## Alternatives

The Review Workflow feature is currently included as a core feature within the Strapi repository. However, there has been discussion about potentially moving it to a plugin in the future. While no decision has been made on this subject yet, it is possible that it may happen at some point in the future.

## Resources

- https://docs.strapi.io/user-docs/settings/review-workflows
- https://docs.strapi.io/user-docs/content-type-builder/creating-new-content-type#creating-a-new-content-type
- https://docs.strapi.io/user-docs/users-roles-permissions/configuring-administrator-roles#plugins-and-settings
- [Content Manager Review Workflows](../../content-manager/02-review-workflows.mdx)
- [Content Type Builder Review Workflows](../../content-type-builder/01-review-workflows.mdx)
