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

A release is planned until it runs, then frozen: nothing changes it afterwards. Planned statuses are recalculated on every change; frozen ones are written once.

- **Empty** (planned): the release has no entries.
- **Ready** (planned): publishing now would release every entry (`all_or_nothing`) or at least one (`allow_partial`).
- **Blocked** (planned): publishing now would release nothing, so it is refused.
- **Done** (frozen): every entry was released. A release with no entries ends done when it runs or misses its schedule.
- **Partial** (frozen, `allow_partial` only): some entries were released, the others skipped.
- **Failed** (frozen): the run released nothing, or a release with entries never ran before its date passed. One that failed before the upgrade is frozen as failed, empty or not, and may have released some entries: nothing recorded which.

See [Backend design](./01-backend.md) for the rules behind each status.

### Publishing a release

A run holds the release row lock (`forUpdate`) for its whole transaction and rejects a release that already ran. It checks every publish entry before writing anything. A release that would release nothing is refused when published by hand, and frozen as `failed` when its schedule runs it. Otherwise, `all_or_nothing` releases every entry in one savepoint, so the first error rolls them all back and the release fails. `allow_partial` skips the entries that aren't publishable and releases each other entry in its own savepoint, so one that throws is skipped alone. The run records each entry's outcome and the release's totals, then freezes the release as `done`, `partial` or `failed`. Code: [`services/release.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/content-releases/server/src/services/release.ts) and [`services/release-run.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/content-releases/server/src/services/release-run.ts).

### Scheduling

The `scheduling` service adds one cron job per scheduled release with `strapi.cron`. At bootstrap, `syncFromDatabase` recreates the jobs for the releases that are not yet released. The row lock stops several instances from publishing the same release twice. Read [Scheduling](./03-scheduling.md).

### Keeping actions in sync with documents

The plugin registers two Document Service middlewares, `createDeleteActionsOnDelete` and `createRevalidateActionsOnDraftChange`. It also subscribes to database lifecycles for `deleteMany`. Once the change commits, they remove the deleted entry's actions from planned releases or revalidate the changed draft, and recalculate the status of those releases. Handlers on the content type sync hooks remove the actions of a content type that is deleted or loses draft and publish, and revalidate the changed content types. See [Extension points](../../../architecture/04-extension-points.md).

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
