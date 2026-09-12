---
title: Introduction
tags:
  - spaces
  - multi-tenancy
---

# Spaces

Spaces let one Strapi project serve several tenants — brands, regions, sites —
from one schema and one deployment, with each tenant's entries, media and
members kept apart.

It is an Enterprise feature, built as a plugin:

```
packages/plugins/spaces
```

## What a space is, and what it is not

A space owns **rows**, not schemas. Every space sees the same content types,
because there is one Content-Type Builder and one database schema; what differs
is which entries, assets, releases and workflows each space can reach.

That is deliberate, and it is the shape that fits the use case Spaces exists
for: one company running French and German sites off one Article model, each
team managing its own articles.

It follows that Spaces does **not** give a tenant:

- its own content model — adding a field to Article adds it everywhere;
- its own deployment, database, backup or resource budget — a heavy job in one
  space still slows the others down;
- protection from code running inside the project. A plugin with database
  access is trusted code, and so is the database operator.

A customer who needs those needs separate projects, not separate spaces.

## The parts

| Piece                       | Where                                | What it does                                                     |
| --------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| Query scope                 | `@strapi/database`                   | Applies the tenant clause to every query the database builds     |
| Request scope               | `server/src/scope`                   | Decides which space a unit of work runs in                       |
| Access rules                | `server/src/services/access.ts`      | Turns a caller plus a request into that space                    |
| Document service middleware | `server/src/document-service`        | Where a new entry lands, and whether its relations are reachable |
| Role scope                  | `server/src/services/permissions.ts` | Which of a user's roles apply where                              |
| Integrations                | `server/src/integrations`            | The features that need more than row filtering                   |

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```
