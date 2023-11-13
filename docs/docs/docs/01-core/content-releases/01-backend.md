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

This content type stores all the information about a release and its associated Release Actions. It is saved in the database as `strapi_release`. The schema can be found in:

```
packages/core/content-releases/server/src/content-types/release/schema.ts
```

### Release Action

This content type is associated with any entry from any content-type with draft and publish enable. It is also responsible for storing the action to perform for the associated entry. It is saved in the database as `strapi_release_actions`. The schema can be found in:

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

**Create a release**:

- method: `POST`
- endpoint: `/content-releases/`

## Controllers

### Release

Interacts with the Release content type

```
packages/core/content-releases/server/src/controllers/release.ts
```

## Services

### Release

Interacts with the database for Release CRUD actions.

```
packages/core/content-releases/server/src/services/release.ts
```
