---
title: Overview
slug: /openapi/contributing/overview
tags:
  - openapi
  - contributing
toc_max_heading_level: 4
---

# OpenAPI

Guides for extending `@strapi/openapi`. Start with [Architecture](../architecture) if you need the overall pipeline.

---

## Extension points

| Guide                                        | Use when you need to…                         |
| -------------------------------------------- | --------------------------------------------- |
| [Routes provider](./routes-provider)         | Collect routes from a new Strapi source       |
| [Routes matcher rule](./routes-matcher-rule) | Filter which routes are documented            |
| [Assemblers](./assemblers)                   | Build or extend OpenAPI document sections     |
| [Context factory](./context-factory)         | Add a new assembly level with its own context |
| [Processors](./processors)                   | Run logic before or after assembly            |
| [Testing](./testing)                         | Write or debug unit tests                     |

Most changes touch **assemblers** (especially operation-level leaf assemblers) or **route collection**. Context factories and processors are needed less often.

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import { useCurrentSidebarCategory } from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items} />
```
