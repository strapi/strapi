---
id: 'FormProps'
title: 'Interface: FormProps<TFormValues>'
sidebar_label: 'FormProps'
sidebar_position: 0
custom_edit_url: null
---

## Type parameters

| Name          | Type                                                                  |
| :------------ | :-------------------------------------------------------------------- |
| `TFormValues` | extends [`FormValues`](FormValues.md) = [`FormValues`](FormValues.md) |

## Hierarchy

- `Partial`<`Pick`<[`FormContextValue`](FormContextValue.md)<`TFormValues`\>, `"disabled"` \| `"initialValues"`\>\>

  ↳ **`FormProps`**

## Properties

### children

• **children**: `ReactNode`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:29

---

### disabled

• `Optional` **disabled**: `boolean`

#### Inherited from

Partial.disabled

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:9

---

### initialValues

• `Optional` **initialValues**: `TFormValues`

#### Inherited from

Partial.initialValues

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:10

---

### method

• **method**: `"POST"` \| `"PUT"`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:30

---

### onSubmit

• `Optional` **onSubmit**: (`values`: `TFormValues`, `helpers`: [`FormHelpers`](FormHelpers.md)<`TFormValues`\>) => `void` \| `Promise`<`void`\>

#### Type declaration

▸ (`values`, `helpers`): `void` \| `Promise`<`void`\>

##### Parameters

| Name      | Type                                            |
| :-------- | :---------------------------------------------- |
| `values`  | `TFormValues`                                   |
| `helpers` | [`FormHelpers`](FormHelpers.md)<`TFormValues`\> |

##### Returns

`void` \| `Promise`<`void`\>

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:31

---

### validationSchema

• `Optional` **validationSchema**: `AnySchema`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:32
