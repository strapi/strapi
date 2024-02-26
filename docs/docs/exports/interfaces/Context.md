---
id: 'Context'
title: 'Interface: Context'
sidebar_label: 'Context'
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- **`Context`**

  ↳ [`PanelComponentProps`](PanelComponentProps.md)

  ↳ [`DocumentActionProps`](DocumentActionProps.md)

  ↳ [`HeaderActionProps`](HeaderActionProps.md)

## Properties

### activeTab

• **activeTab**: `null` \| `"draft"` \| `"published"`

This will ONLY be null, if the content-type
does not have draft & published enabled.

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:18

---

### collectionType

• **collectionType**: `string`

Will be either 'single-types' | 'collection-types'

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:22

---

### document

• `Optional` **document**: `AnyDocument`

this will be undefined if someone is creating an entry.

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:26

---

### id

• `Optional` **id**: `string`

this will be undefined if someone is creating an entry.

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:30

---

### meta

• `Optional` **meta**: `DocumentMetadata`

this will be undefined if someone is creating an entry.

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:34

---

### model

• **model**: `string`

The current content-type's model.

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:38
