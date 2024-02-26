---
id: 'HeaderActionProps'
title: 'Interface: HeaderActionProps'
sidebar_label: 'HeaderActionProps'
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`Context`](Context.md)

  ↳ **`HeaderActionProps`**

## Properties

### activeTab

• **activeTab**: `null` \| `"draft"` \| `"published"`

This will ONLY be null, if the content-type
does not have draft & published enabled.

#### Inherited from

[Context](Context.md).[activeTab](Context.md#activetab)

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:18

---

### collectionType

• **collectionType**: `string`

Will be either 'single-types' | 'collection-types'

#### Inherited from

[Context](Context.md).[collectionType](Context.md#collectiontype)

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:22

---

### document

• `Optional` **document**: `AnyDocument`

this will be undefined if someone is creating an entry.

#### Inherited from

[Context](Context.md).[document](Context.md#document)

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:26

---

### id

• `Optional` **id**: `string`

this will be undefined if someone is creating an entry.

#### Inherited from

[Context](Context.md).[id](Context.md#id)

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:30

---

### meta

• `Optional` **meta**: `DocumentMetadata`

this will be undefined if someone is creating an entry.

#### Inherited from

[Context](Context.md).[meta](Context.md#meta)

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:34

---

### model

• **model**: `string`

The current content-type's model.

#### Inherited from

[Context](Context.md).[model](Context.md#model)

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:38
