---
title: Main navigation extensions
description: 'How a plugin adds a menu at the bottom of the main navigation and tints it.'
status: draft
review_notes:
  - New experimental API, written with the code; needs a maintainer review.
tags:
  - frontend
  - public-api
---

Plugins can add a menu at the bottom of the main navigation, above the profile menu, and tint the navigation with a colour. Spaces uses them to show the current space, switch to another one, and colour the navigation of a space. The code is in [`admin/src/core/apis/MainNav.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/core/apis/MainNav.ts) and [`admin/src/components/MainNav/NavMenus.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/components/MainNav/NavMenus.tsx).

The API is experimental, hence the `unstable_` prefix: it can change in a minor release.

## Adding a menu

A plugin adds it in its admin `register`:

```tsx
import { Menu } from '@strapi/design-system';

app.unstable_addMainNavMenu({
  id: 'my-plugin.switcher',
  intlLabel: { id: 'my-plugin.switcher.label', defaultMessage: 'Space' },
  permissions: [],
  useCurrent: () => {
    const { current, spaces } = useSpaces();

    if (!current) {
      return null;
    }

    return { label: current.name, icon: <SpaceTile />, readOnly: spaces.length < 2 };
  },
  Content: () => (
    <>
      <Menu.Item onSelect={() => switchTo('control-center')}>Control center</Menu.Item>
      <Menu.Item onSelect={() => switchTo('france')}>France</Menu.Item>
    </>
  ),
});
```

- `id`: unique. Adding the same id twice throws.
- `intlLabel`: read before the current value in the tooltip and accessible name, for example "Space: Control center".
- `useCurrent`: a hook that returns the current value, `{ label, icon, readOnly? }`, or `null`. The trigger shows `icon`. While it returns `null`, for example while its data loads or when there is nothing to show, the menu is hidden. With `readOnly`, core shows the value without a menu, for example when there is nothing to switch to. Keep returning the last value while the data refetches: `null` hides the menu, even an open one. It only runs for users who see the menu.
- `permissions` (optional): the menu shows to users who have one of them at least. Without, all users see it.
- `Content`: rendered inside the design system `Menu.Content`, so it renders `Menu.Item`, `Menu.Label` and `Menu.Separator`. Core owns the trigger, the placement, the keyboard and focus, and closing: on Escape, a click outside, or the selection of an item. While the menu is open, core draws a round ring around the trigger icon.

Add menus in the admin `register`: once the admin renders, adding one throws. Menus show in the order plugins add them. On desktop they sit above the profile menu, and their menu opens to the right of the navigation. On mobile they show in the burger menu, above the profile menu, with their name.

## Tinting the navigation

```ts
app.unstable_addMainNavTint(() => {
  const space = useCurrentSpace();

  return space?.tintNavigation ? space.color : null;
});
```

- The argument is a hook: it can call other hooks, and returns a CSS colour or `null`.
- Every tint runs on every render, in the order plugins added them. The first one that returns a colour wins. With none, the navigation keeps its colours.
- Core sets the colour as `--main-nav-tint` on the navigation, and mixes it with the theme's colours with `color-mix()`: a light wash of it on the background and the border, and on the hover and active links. Icons turn a shade darker, and the active link icon is half the colour, half the theme's text colour, so icons keep a 3:1 contrast on the wash with light colours too. Badges on links, like the license lightning, keep their own colour. Text keeps the theme's colours, so it stays readable in light and dark mode.

## Related

- [`@strapi/admin`](./index.md): `StrapiApp` and the other admin APIs.
