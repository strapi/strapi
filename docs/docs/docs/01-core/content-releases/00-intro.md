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

Releases are assigned one of five statuses:

- **Ready**: Indicates that the release is fully prepared for publishing, with no invalid entries present.
- **Blocked**: Release has at least one invalid entry preventing publishing.
- **Empty**: Release contains no entries and cannot be published.
- **Failed**: Indicates that the publishing attempt for the release has encountered an error with no changes since then.
- **Done**: Confirms that the release has been successfully published without encountering any errors.

These statuses are dynamically updated based on actions such as creation, addition/removal of entries, updates, and publishing attempts. They provide a concise overview of release readiness and validity, ensuring smooth operations and data integrity.
