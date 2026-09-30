---
title: '@strapi/content-releases'
sidebar_label: 'content-releases'
description: 'Enterprise core plugin that groups documents into releases and publishes or unpublishes them together, now or on a schedule.'
package: '@strapi/content-releases'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

A release contains various content entries, each capable of being assigned a specific action such as publish or unpublish. Within a release, entries may be in different locales or come from different content types. With a simple click of a button, a release can execute the designated action for each entry. Content Releases is an enterprise edition feature.

The plugin runs on the server and in the admin panel. The admin part plugs into the Content Manager edit view and list view. The server part depends on the Document Service to publish documents.

## Key concepts

### Release and release action

The plugin defines two hidden content types. `Release` (`strapi_releases`) stores the name, the status and the schedule. `Release Action` (`strapi_release_actions`) stores one action for one entry. An action links to its entry with `contentType`, `locale` and `entryDocumentId`, not with a relation, because the entry ID can change and the document ID does not. Read [Backend design](./01-backend.md).

### Release's status

Releases are assigned one of five statuses:

- **Ready**: Indicates that the release is fully prepared for publishing, with no invalid entries present.
- **Blocked**: Release has at least one invalid entry preventing publishing.
- **Empty**: Release contains no entries and cannot be published.
- **Failed**: Indicates that the publishing attempt for the release has encountered an error with no changes since then.
- **Done**: Confirms that the release has been successfully published without encountering any errors.

These statuses are dynamically updated based on actions such as creation, addition/removal of entries, updates, and publishing attempts. They provide a concise overview of release readiness and validity, ensuring smooth operations and data integrity.

### Publishing a release

The `release` service locks the release row with `forUpdate` in a transaction. It rejects a release that is already published or failed. It groups the actions by content type, publishes in an order that keeps relations, and calls `strapi.documents(uid).publish` and `unpublish`. On success it sets the status to `done`. On failure it sets `failed`. Code: [`services/release.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/content-releases/server/src/services/release.ts).

### Scheduling

The `scheduling` service adds one cron job per scheduled release with `strapi.cron`. At bootstrap, `syncFromDatabase` recreates the jobs for the releases that are not yet released. The row lock stops several instances from publishing the same release twice. Read [Scheduling](./03-scheduling.md).

### Keeping actions in sync with documents

The plugin registers two Document Service middlewares, `deleteActionsOnDelete` and `updateActionsOnUpdate`. It also subscribes to database lifecycles for `deleteMany`. They delete actions or revalidate entries when a document changes, and they update the status of the releases that hold them. Handlers on the content type sync hooks delete actions when draft and publish is disabled or a content type is deleted, and they revalidate the changed content types. See [Extension points](../../../architecture/04-extension-points.md).

### Built as a plugin

Most EE features live in the [EE folders](../../../architecture/09-enterprise-edition.md) of their package. Releases is built as its own plugin instead. The server entry checks `strapi.ee.features.isEnabled('cms-content-releases')`. When the feature is off, the plugin exports only `register` and `contentTypes`, so the release data stays in the database.

### Admin part

The admin part adds a menu link, a settings page, a dashboard widget and the Releases and Release details pages. It injects an edit view side panel, a document action, a bulk action and a list view column into the Content Manager through its plugin APIs and hooks. Read the [frontend introduction](./02-frontend/00-intro.md) and [Content Manager and releases](../content-manager/03-content-releases.md).

## Related

- [Enterprise Edition](../../../architecture/09-enterprise-edition.md): how the license enables features such as `cms-content-releases`.
- [Document write path](../../../architecture/05-document-write-path.md): the publish calls that a release makes.
- [Server lifecycle](../../../architecture/02-server-lifecycle.md): where the plugin `register` and `bootstrap` run.
- [`@strapi/content-manager`](../content-manager/index.md): hosts the edit view, list view and bulk action extension points.
- [`@strapi/admin`](../admin/index.md): permissions, settings and the widget API.
- [`@strapi/core`](../core/index.md): Document Service, cron and webhook store.
- [`@strapi/data-transfer`](../data-transfer/index.md): skips the release content types during a transfer.
