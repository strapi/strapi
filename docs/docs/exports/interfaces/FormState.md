---
id: 'FormState'
title: 'Interface: FormState<TFormValues>'
sidebar_label: 'FormState'
sidebar_position: 0
custom_edit_url: null
---

## Type parameters

| Name          | Type                                                                  |
| :------------ | :-------------------------------------------------------------------- |
| `TFormValues` | extends [`FormValues`](FormValues.md) = [`FormValues`](FormValues.md) |

## Hierarchy

- **`FormState`**

  ↳ [`FormContextValue`](FormContextValue.md)

## Properties

### errors

• **errors**: `FormErrors`<`TFormValues`\>

TODO: make this a better type explaining errors could be nested because it follows the same
structure as the values.

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:51

---

### isSubmitting

• **isSubmitting**: `boolean`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:52

---

### values

• **values**: `TFormValues`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:53
