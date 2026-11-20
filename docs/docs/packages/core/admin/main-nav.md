---
title: Main navigation extensions
description: 'How a plugin adds a menu at the bottom of the main navigation.'
status: draft
review_notes:
  - New experimental API, written with the code; needs a maintainer review.
tags:
  - frontend
  - public-api
---

Plugins can add a menu at the bottom of the main navigation, above the profile menu. Spaces uses it to show the current space and switch to another one. The code is in [`admin/src/core/apis/MainNav.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/core/apis/MainNav.ts) and [`admin/src/components/MainNav/NavMenus.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/components/MainNav/NavMenus.tsx).

The API is experimental, hence the `unstable_` prefix: it can change in a minor release.

## Adding a menu

A plugin adds it in its admin `register`:

```tsx
import { Menu } from '@strapi/design-system';

app.unstable_addMainNavMenu({
  id: 'my-plugin.switcher',
  icon: Earth,
  intlLabel: { id: 'my-plugin.switcher.label', defaultMessage: 'Space' },
  permissions: [],
  useCurrent: () => ({ label: 'Control center', icon: <SpaceTile /> }),
  Content: () => (
    <>
      <Menu.Item onSelect={() => switchTo('control-center')}>Control center</Menu.Item>
      <Menu.Item onSelect={() => switchTo('france')}>France</Menu.Item>
    </>
  ),
});
```

- `id`: unique. Adding the same id twice throws.
- `icon` and `intlLabel`: the trigger shows the icon, and its tooltip and accessible name read the label, while `useCurrent` returns no value.
- `useCurrent` (optional): a hook that returns the current value, `{ label, icon? }`, or `null`. The trigger then shows its icon, and its tooltip and accessible name read "Space: Control center".
- `permissions` (optional): the menu shows to users who have one of them at least. Without, all users see it.
- `Content`: rendered inside the design system `Menu.Content`, so it renders `Menu.Item`, `Menu.Label` and `Menu.Separator`. Core owns the trigger, the placement, the keyboard and focus, and closing: on Escape, a click outside, or the selection of an item.

Menus show in the order plugins add them. On desktop they sit above the profile menu, and their menu opens to the right of the navigation. On mobile they show in the burger menu, above the profile menu, with their name.

## Related

- [`@strapi/admin`](./index.md): `StrapiApp` and the other admin APIs.
