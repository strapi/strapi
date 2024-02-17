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

Th `Release Action` content type is associated with any entry from any content-type that has draft and publish enabled. It is responsible for storing the action to perform for an associated entry. It is saved in the database as `strapi_release_actions`. The schema can be found in:

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
- endpoint: `/content-releases/`
- params:
  ```ts
  {
    contentTypeUid: string;
    entryId: number;
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
    entry: {
      id: number,
      contentType: string,
      locale: string,
    }
    type: 'publish' | 'unpublish'
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

Interacts with the database for Release and Release Action CRUD operations

```
packages/core/content-releases/server/src/services/release.ts
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

## Migrations

We have two migrations that we run every time we sync the content types.

### `deleteActionsOnDisableDraftAndPublish`

When a user disables Draft and Publish in one Content Type we make sure to remove all the release actions related to entries of that content type to avoid errors.

### `deleteActionsOnDeleteContentType`

When a Content Type is deleted, delete all actions containing entries from that Content Type.

## Subscribing to Lifecycles Events

When an entry is deleted delete all actions containing that entry.
