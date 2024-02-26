---
id: 'DocumentActionDescription'
title: 'Interface: DocumentActionDescription'
sidebar_label: 'DocumentActionDescription'
sidebar_position: 0
custom_edit_url: null
---

## Properties

### dialog

• `Optional` **dialog**: `DialogOptions` \| `NotificationOptions` \| `ModalOptions`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/pages/EditView/components/DocumentActions.d.ts:17

---

### disabled

• `Optional` **disabled**: `boolean`

**`Default`**

```ts
false;
```

#### Defined in

packages/core/admin/dist/admin/src/content-manager/pages/EditView/components/DocumentActions.d.ts:11

---

### icon

• `Optional` **icon**: `ReactNode`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/pages/EditView/components/DocumentActions.d.ts:7

---

### label

• **label**: `string`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/pages/EditView/components/DocumentActions.d.ts:5

---

### onClick

• `Optional` **onClick**: (`event`: `SyntheticEvent`<`Element`, `Event`\>) => `boolean` \| `void` \| `Promise`<`boolean` \| `void`\>

#### Type declaration

▸ (`event`): `boolean` \| `void` \| `Promise`<`boolean` \| `void`\>

##### Parameters

| Name    | Type                                  |
| :------ | :------------------------------------ |
| `event` | `SyntheticEvent`<`Element`, `Event`\> |

##### Returns

`boolean` \| `void` \| `Promise`<`boolean` \| `void`\>

#### Defined in

packages/core/admin/dist/admin/src/content-manager/pages/EditView/components/DocumentActions.d.ts:6

---

### position

• `Optional` **position**: `DocumentActionPosition` \| `DocumentActionPosition`[]

**`Default`**

```ts
'panel';
```

**`Description`**

Where the action should be rendered.

#### Defined in

packages/core/admin/dist/admin/src/content-manager/pages/EditView/components/DocumentActions.d.ts:16

---

### variant

• `Optional` **variant**: `"default"` \| `"success"` \| `"secondary"` \| `"danger"`

**`Default`**

```ts
'secondary';
```

#### Defined in

packages/core/admin/dist/admin/src/content-manager/pages/EditView/components/DocumentActions.d.ts:21
