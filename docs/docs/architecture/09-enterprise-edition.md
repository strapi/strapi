---
title: Enterprise Edition
description: 'Overview of Strapi Enterprise Edition features and capabilities.'
tags:
  - enterprise-edition
status: needs-review
review_notes:
  - '`hooks/useSettingsMenu/index.js` is now `useSettingsMenu.ts`; verify the EE-to-CE recipe.'
---

EE features documented so far:

- [Review workflows](../packages/core/review-workflows/01-backend.md)
- [Audit logs](../packages/core/admin/ee/audit-logs.md)
- [`useLicenseLimits` hook](../packages/core/admin/ee/hooks/use-license-limits.md)
- [Content releases](../packages/core/content-releases/index.md)

## Promoting EE features in CE projects

Every time a new EE feature is added in Strapi, in the settings menu, you should add the following condition to ensure that the feature promotes itself in CE:

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
