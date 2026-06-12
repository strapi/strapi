---
title: Overview
slug: /openapi/contributing/overview
tags:
  - openapi
  - contributing
toc_max_heading_level: 4
---

# OpenAPI

Guides for extending `@strapi/openapi`. Start with [Architecture](../02-architecture.md) if you need the overall pipeline.

---

## Extension points

| Guide                                              | Use when you need to…                         |
| -------------------------------------------------- | --------------------------------------------- |
| [Routes provider](./01-routes-provider.md)         | Collect routes from a new Strapi source       |
| [Routes matcher rule](./02-routes-matcher-rule.md) | Filter which routes are documented            |
| [Assemblers](./03-assemblers.md)                   | Build or extend OpenAPI document sections     |
| [Context factory](./04-context-factory.md)         | Add a new assembly level with its own context |
| [Processors](./05-processors.md)                   | Run logic before or after assembly            |
| [Testing](./06-testing.md)                         | Write or debug unit tests                     |

Most changes touch **assemblers** (especially operation-level leaf assemblers) or **route collection**. Context factories and processors are needed less often.

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import { useCurrentSidebarCategory } from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items} />
```
