---
id: 'PanelComponent'
title: 'Interface: PanelComponent'
sidebar_label: 'PanelComponent'
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`DescriptionComponent`](DescriptionComponent.md)<[`PanelComponentProps`](PanelComponentProps.md), [`PanelDescription`](PanelDescription.md)\>

  ↳ **`PanelComponent`**

## Callable

### PanelComponent

▸ **PanelComponent**(`props`): `null` \| [`PanelDescription`](PanelDescription.md)

#### Parameters

| Name    | Type                                            |
| :------ | :---------------------------------------------- |
| `props` | [`PanelComponentProps`](PanelComponentProps.md) |

#### Returns

`null` \| [`PanelDescription`](PanelDescription.md)

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:42

## Properties

### type

• `Optional` **type**: `"actions"` \| `"review-workflows"` \| `"releases"`

The defaults are added by Strapi only, if you're providing your own component,
you do not need to provide this.

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:47
