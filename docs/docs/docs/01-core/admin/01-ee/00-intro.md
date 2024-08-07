---
title: Introduction
tags:
  - enterprise-edition
---

# Admin Enterprise Edition

This section is an overview of all the features related to the Enterprise Edition in Admin:

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import { useCurrentSidebarCategory } from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items} />
```

# Promoting EE features in CE projects

Everytime a new EE feature is added in Strapi, in the settings menu, you should add the following condition to ensure that the feature promotes itself in CE:

`packages/core/admin/admin/src/hooks/useSettingsMenu/index.js`

```js
...

 ...(!window.strapi.features.isEnabled(window.strapi.features.NEW_EE_FEATURE) &&
    window.strapi?.flags?.promoteEE
      ? [
          {
            intlLabel: {
              id: 'Settings.new-ee-feature.page.title',
              defaultMessage: 'NEW EE FEATURE',
            },
            to: '/settings/purchase-new-ee-feature',
            id: 'new-ee-feature',
            licenseOnly: true,
          },
        ]
      : []),
...
```
