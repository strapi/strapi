---
title: Backend Design
description: Content Releases backend
tags:
  - content-releases
  - tech design
---

All backend code can be found in:

```
 packages/core/content-releases/server
```

## Content-types

The content-releases plugin creates two hidden content-types.

### Release

The `Release` content type stores all the information about a release and its associated Release Actions. It is saved in the database as `strapi_releases`. The schema can be found in:

```
packages/core/content-releases/server/src/content-types/release/schema.ts
```

### Release Action

Th `Release Action` content type is associated with any entry from any content-type that has draft and publish enabled. It is responsible for storing the action to perform for an associated entry. It is saved in the database as `strapi_release_actions`. In v4, we used built-in polymorphic relations, but for v5, we stored `contentType`, `locale`, and `entryDocumentId` in the Release Action schema to create a "manual" relationship between actions and entries. This approach allows us to link a release action to a document ID instead of a specific entry ID, as the entry ID may change over time and is not reliable.

The schema can be found in:

```
packages/core/content-releases/server/src/content-types/release-action/schema.ts
```

## Routes

Release and Release Action routes are only accessible on the Admin API.

### Release

Release routes can be found in:

```
packages/core/content-releases/server/src/routes/release.ts
```

**Get all releases**:

- method: `GET`
- endpoint: `/content-releases/`
- params:
  ```ts
  {
    page: number;
    pageSize: number;
  }
  ```

**Get all releases with/without an entry**:

- method: `GET`
- endpoint: `/content-releases/getByDocumentAttached`
- params:
  ```ts
  {
    contentTypeUid: string;
    locale?: string;
    documentId?: string;
    hasEntryAttached?: boolean;
  }
  ```

**Get a single release**

- method: `GET`
- endpoint: `/content-releases/:id`

**Create a release**:

- method: `POST`
- endpoint: `/content-releases/`
- body:
  ```ts
  {
    name: string;
  }
  ```

**Update a release**:

- method: `PUT`
- endpoint: `/content-releases/:id`
- body:
  ```ts
  {
    name: string;
  }
  ```

**Delete a release**:

- method: `DELETE`
- endpoint: `/content-releases/:id`

**Publish a release**:

- method: `POST`
- endpoint: `/content-releases/:id/publish`

### Release Action

**Create a release action**

- method: `POST`
- endpoint: `/content-releases/:releaseId/actions`
- body:

  ```ts
  {
    type: 'publish' | 'unpublish',
    contentType: string;
    locale?: string;
    entryDocumentId?: string;
  }
  ```

**Get release actions from a release**

- method: `GET`
- endpoint: `/content-releases/:releaseId/actions`
- body:
  ```ts
  {
    page: number;
    pageSize: number;
  }
  ```

**Update a release action**

- method: `PUT`
- endpoint: `/content-releases/:releaseId/actions/:actionId`
- body:
  ```ts
  {
    type: 'publish' | 'unpublish';
  }
  ```

**Delete a release action**

- method: `DELETE`
- endpoint: `/content-releases/:releaseId/actions/:actionId`

## Controllers

### Release

Handles requests to interact with the Release content type

```
packages/core/content-releases/server/src/controllers/release.ts
```

### Release Action

Handles requests to interact with the Release Action content type

## Services

### Release

Interacts with the database for Release CRUD operations

```
packages/core/content-releases/server/src/services/release.ts
```

### Release Actions

Interacts with the database for Release Actions CRUD operations

```
packages/core/content-releases/server/src/services/release-action.ts
```

### Release Validation

Exposes validation functions to run before performing operations on a Release

```
packages/core/content-releases/server/src/services/validation.ts
```

### Scheduling

:::caution
Scheduling is still under development, but you can try it **at your own risk** with future flags. The future flag to enable scheduling is `contentReleasesScheduling`.
:::

Exposes methods to schedule release date for releases.

```
packages/core/content-releases/server/src/services/scheduling.ts
```

### Release status update triggers:

Each release has a `releaseCondition`: `all_or_nothing` (the default, and the value given to releases created before the field existed) or `allow_partial`. A publish entry is publishable when its draft passes publish validation and, if its content type's review workflow has a stage required to publish, the entry is at that stage. Without review workflows, only validation applies. Unpublish entries are always publishable. Each release action stores whether its entry was publishable when last checked (`isEntryValid`), and the status is derived from those values:

- **Empty**: the release has no entries.
- **Blocked**: publishing now would release nothing. With `all_or_nothing`, at least one entry is not publishable. With `allow_partial`, no entry is publishable.
- **Ready**: otherwise. An `allow_partial` release with some entries that aren't publishable is ready: they are skipped when it runs.

After it runs, a release has one of these statuses:

- **Done**: every entry was published or unpublished. A release with no entries ends done.
- **Partial**: some entries were released and some were not.
- **Failed**: no entry was released.

Considering that retrieving the status of all entries in a release is a heavy operation, we don't fetch it every time a user wants to access a release. Instead, we store the status in a field within the Release Content Type, and we only update it when an action that changes the status is triggered. These actions include:

#### Creating a release:

When creating a release, its status is automatically set to "Empty" as there are no entries initially.

#### Adding an entry to a release:

Upon adding an entry to a release, its status is recalculated to either "Ready" or "Blocked" from the validity of its entries and its release condition.

#### Removing an entry from a release:

After removing an entry from a release, the status is recalculated to determine if the release is now "Ready", "Blocked", or "Empty".

#### Updating a release:

Whenever a release is updated, its status is recalculated, so switching the release condition switches between "Ready" and "Blocked". The recalculation is awaited, so a read right after the update sees the new status.

#### Publishing a release:

A publish is either manual (the publish button or the API) or scheduled (the scheduler, at the release date). Under the release row lock, the run first reads every publish entry's current draft and checks whether it is publishable, before writing anything. Entries are then handled one at a time: content types in relation dependency order, publishes before unpublishes, each in the order they were added. They all share the lock transaction, so an entry released by the run stays released even if a later one fails.

- `allow_partial`: entries that aren't publishable are skipped without being written. Each other entry is published or unpublished on its own: if that throws, the entry is skipped and the run moves on.
- `all_or_nothing`: if any entry isn't publishable, no entry is written. Otherwise every entry is published or unpublished, and the first error stops the run.

When the check finds that a run would release nothing (`all_or_nothing`: any entry not publishable; `allow_partial`: no entry publishable; never for a release with no entries):

- A manual publish is rejected with the first such entry's validation error, in run order. Nothing is published, the check's result is stored on the release actions (`isEntryValid`), and the status is recalculated, so the release stays planned and reads "Blocked" even if the stored values had gone out of date. No webhook or audit event is sent.
- A scheduled run fails: the status becomes "Failed", with the first entry's error for `all_or_nothing` and `No entries were published` for `allow_partial`.

How a run ends:

- Every entry released, or no entries at all: "Done", with `releasedAt` set.
- Some entries released and some not: "Partial", with `releasedAt` set. This includes an `all_or_nothing` run stopped by an unexpected error after some entries went out: those stay published, and the request fails with the error.
- No entry released (an `allow_partial` run whose entries all failed, or an `all_or_nothing` run stopped by an error on its first entry): "Failed", and the request fails. A failed release keeps `releasedAt` empty for now, so it stays pending.

The `releases.publish` webhook is sent with `isPublished: true` when at least one entry was released.

#### Listening to events on entries:

When an entry is updated or deleted, the status of all releases containing that entry is recalculated to reflect any changes in validity.

## Migrations

We have two migrations that we run every time we sync the content types.

### `deleteActionsOnDisableDraftAndPublish`

When a user disables Draft and Publish in one Content Type we make sure to remove all the release actions related to entries of that content type to avoid errors.

### `deleteActionsOnDeleteContentType`

When a Content Type is deleted, delete all actions containing entries from that Content Type.

## Subscribing to Lifecycles Events

When an entry is deleted delete all actions containing that entry.
