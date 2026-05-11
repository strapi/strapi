# Strapi Architecture

This directory contains a LikeC4 workspace for modeling the Strapi monorepo.

## Setup

```bash
cd architecture
yarn install
```

## Work locally

```bash
yarn dev
```

The LikeC4 dev server watches all `.c4` and `.likec4` files in this directory.

## Build or export

```bash
yarn build
yarn export:png
yarn export:mermaid
```

## Structure

- `specification.c4` defines the modeling notation.
- `model/strapi.c4` contains the shared Strapi system model.
- `views/content-api.c4` contains the initial C4 views focused on the Content API.

The current model is intentionally a starting point. It captures the Content API request path, auth and permissions, route registration, generated core API layer, document service, and database boundary.
