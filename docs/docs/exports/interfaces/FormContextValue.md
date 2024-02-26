---
id: 'FormContextValue'
title: 'Interface: FormContextValue<TFormValues>'
sidebar_label: 'FormContextValue'
sidebar_position: 0
custom_edit_url: null
---

## Type parameters

| Name          | Type                                                                  |
| :------------ | :-------------------------------------------------------------------- |
| `TFormValues` | extends [`FormValues`](FormValues.md) = [`FormValues`](FormValues.md) |

## Hierarchy

- [`FormState`](FormState.md)<`TFormValues`\>

  ↳ **`FormContextValue`**

## Properties

### addFieldRow

• **addFieldRow**: (`field`: `string`, `value`: `any`, `addAtIndex?`: `number`) => `void`

The default behaviour is to add the row to the end of the array, if you want to add it to a
specific index you can pass the index.

#### Type declaration

▸ (`field`, `value`, `addAtIndex?`): `void`

The default behaviour is to add the row to the end of the array, if you want to add it to a
specific index you can pass the index.

##### Parameters

| Name          | Type     |
| :------------ | :------- |
| `field`       | `string` |
| `value`       | `any`    |
| `addAtIndex?` | `number` |

##### Returns

`void`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:16

---

### disabled

• **disabled**: `boolean`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:9

---

### errors

• **errors**: `FormErrors`<`TFormValues`\>

TODO: make this a better type explaining errors could be nested because it follows the same
structure as the values.

#### Inherited from

[FormState](FormState.md).[errors](FormState.md#errors)

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:51

---

### initialValues

• **initialValues**: `TFormValues`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:10

---

### isSubmitting

• **isSubmitting**: `boolean`

#### Inherited from

[FormState](FormState.md).[isSubmitting](FormState.md#issubmitting)

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:52

---

### modified

• **modified**: `boolean`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:11

---

### moveFieldRow

• **moveFieldRow**: (`field`: `string`, `fromIndex`: `number`, `toIndex`: `number`) => `void`

#### Type declaration

▸ (`field`, `fromIndex`, `toIndex`): `void`

##### Parameters

| Name        | Type     |
| :---------- | :------- |
| `field`     | `string` |
| `fromIndex` | `number` |
| `toIndex`   | `number` |

##### Returns

`void`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:17

---

### onChange

• **onChange**: (`eventOrPath`: `string` \| `ChangeEvent`<`any`\>, `value?`: `any`) => `void`

#### Type declaration

▸ (`eventOrPath`, `value?`): `void`

##### Parameters

| Name          | Type                              |
| :------------ | :-------------------------------- |
| `eventOrPath` | `string` \| `ChangeEvent`<`any`\> |
| `value?`      | `any`                             |

##### Returns

`void`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:18

---

### removeFieldRow

• **removeFieldRow**: (`field`: `string`, `removeAtIndex?`: `number`) => `void`

#### Type declaration

▸ (`field`, `removeAtIndex?`): `void`

##### Parameters

| Name             | Type     |
| :--------------- | :------- |
| `field`          | `string` |
| `removeAtIndex?` | `number` |

##### Returns

`void`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:19

---

### setErrors

• **setErrors**: (`errors`: `FormErrors`<`TFormValues`\>) => `void`

#### Type declaration

▸ (`errors`): `void`

##### Parameters

| Name     | Type                         |
| :------- | :--------------------------- |
| `errors` | `FormErrors`<`TFormValues`\> |

##### Returns

`void`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:20

---

### setSubmitting

• **setSubmitting**: (`isSubmitting`: `boolean`) => `void`

#### Type declaration

▸ (`isSubmitting`): `void`

##### Parameters

| Name           | Type      |
| :------------- | :-------- |
| `isSubmitting` | `boolean` |

##### Returns

`void`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:21

---

### validate

• **validate**: () => `Promise`<`null` \| `FormErrors`<`TFormValues`\>\>

#### Type declaration

▸ (): `Promise`<`null` \| `FormErrors`<`TFormValues`\>\>

##### Returns

`Promise`<`null` \| `FormErrors`<`TFormValues`\>\>

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:22

---

### values

• **values**: `TFormValues`

#### Inherited from

[FormState](FormState.md).[values](FormState.md#values)

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:53
