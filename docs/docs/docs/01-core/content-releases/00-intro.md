---
title: Introduction
tags:
  - content-releases
---

# Content Releases

A release contains various content entries, each capable of being assigned a specific action such as publish or unpublish. Within a release, entries may be in different locales or come from different content types. With a simple click of a button, a release can execute the designated action for each entry. Content Releases is an enterprise edition feature.

### Architecture

As opposed to other EE features built in the [EE folder](docs/docs/01-core/admin/01-ee/00-intro.md), Releases is built as a plugin. The plugin can be found in:

```
packages/core/content-releases
```

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import { useCurrentSidebarCategory } from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items} />
```

### Release's status

A release is planned until it runs, then frozen: nothing changes it afterwards. Planned statuses are recalculated on every change; frozen ones are written once.

- **Empty** (planned): the release has no entries.
- **Ready** (planned): publishing now would release every entry (`all_or_nothing`) or at least one (`allow_partial`).
- **Blocked** (planned): publishing now would release nothing, so it is refused.
- **Done** (frozen): every entry was released. A release with no entries ends done when it runs or misses its schedule.
- **Partial** (frozen, `allow_partial` only): some entries were released, the others skipped.
- **Failed** (frozen): the run released nothing, or a release with entries never ran before its date passed. One that failed before the upgrade is frozen as failed, empty or not, and may have released some entries: nothing recorded which.

See [Backend Design](./01-backend.md) for the rules behind each status.
