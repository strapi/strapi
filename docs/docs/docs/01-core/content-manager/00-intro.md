---
title: Introduction
tags:
  - content-manager
---

# Content Manager

## What is the Content Manager?

The content-manager is a plugin that allows users to write / update & delete their content, it's currently held within the `@strapi/admin` package, but from V5 will be removed back to to its own plugin. At its very basic form, the CM is just a table & a few forms. There are a few public APIs to manipulate these forms & tables as well as some universal hooks exported for user's to additionally interact with within their own plugins outside of the CM plugin & within.

## Sections

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import { useCurrentSidebarCategory } from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items.filter(item => item.label !== "Introduction")} />
```
