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

Considering that retrieving the status of all entries in a release is a heavy operation, we don't fetch it every time a user wants to access a release. Instead, we store the status in a field within the Release Content Type, and we only update it when an action that changes the status is triggered. These actions include:

#### Creating a release:

When creating a release, its status is automatically set to "Empty" as there are no entries initially.

#### Adding an entry to a release:

Upon adding an entry to a release, its status is recalculated to either "Ready" or "Blocked" based on the validity of the added entry.

#### Removing an entry from a release:

After removing an entry from a release, the status is recalculated to determine if the release is now "Ready", "Blocked", or "Empty".

#### Updating a release:

Whenever a release is updated, its status is recalculated based on the validity of the actions performed during the update.

#### Publishing a release:

During the publishing process, if successful, the status changes to "Done"; otherwise, it changes to "Failed".

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
