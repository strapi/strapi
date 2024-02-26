---
id: 'ListFieldLayout'
title: 'Interface: ListFieldLayout'
sidebar_label: 'ListFieldLayout'
sidebar_position: 0
custom_edit_url: null
---

## Properties

### attribute

• **attribute**: `Any` \| \{ `type`: `"custom"` }

The attribute data from the content-type's schema for the field

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentLayout.d.ts:18

---

### cellFormatter

• `Optional` **cellFormatter**: (`data`: `AnyDocument`, `header`: `Omit`<[`ListFieldLayout`](ListFieldLayout.md), `"cellFormatter"`\>, `__namedParameters`: \{ `collectionType`: `string` ; `model`: `string` }) => `ReactNode`

Typically used by plugins to render a custom cell

#### Type declaration

▸ (`data`, `header`, `«destructured»`): `ReactNode`

Typically used by plugins to render a custom cell

##### Parameters

| Name               | Type                                                                |
| :----------------- | :------------------------------------------------------------------ |
| `data`             | `AnyDocument`                                                       |
| `header`           | `Omit`<[`ListFieldLayout`](ListFieldLayout.md), `"cellFormatter"`\> |
| `«destructured»`   | `Object`                                                            |
| › `collectionType` | `string`                                                            |
| › `model`          | `string`                                                            |

##### Returns

`ReactNode`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentLayout.d.ts:24

---

### label

• **label**: `string` \| `MessageDescriptor`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentLayout.d.ts:28

---

### mainField

• `Optional` **mainField**: `string`

the name of the attribute we use to display the actual name e.g. relations
are just ids, so we use the mainField to display something meaninginful by
looking at the target's schema

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentLayout.d.ts:34

---

### name

• **name**: `string`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentLayout.d.ts:35

---

### searchable

• `Optional` **searchable**: `boolean`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentLayout.d.ts:36

---

### sortable

• `Optional` **sortable**: `boolean`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentLayout.d.ts:37
