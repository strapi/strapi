---
id: 'modules'
title: '@strapi/strapi'
sidebar_label: 'Exports'
sidebar_position: 0.5
custom_edit_url: null
---

## Interfaces

- [Context](interfaces/Context.md)
- [DescriptionComponent](interfaces/DescriptionComponent.md)
- [DocumentActionComponent](interfaces/DocumentActionComponent.md)
- [DocumentActionDescription](interfaces/DocumentActionDescription.md)
- [DocumentActionProps](interfaces/DocumentActionProps.md)
- [EditLayout](interfaces/EditLayout.md)
- [FieldValue](interfaces/FieldValue.md)
- [FormContextValue](interfaces/FormContextValue.md)
- [FormHelpers](interfaces/FormHelpers.md)
- [FormProps](interfaces/FormProps.md)
- [FormState](interfaces/FormState.md)
- [FormValues](interfaces/FormValues.md)
- [HeaderActionComponent](interfaces/HeaderActionComponent.md)
- [HeaderActionProps](interfaces/HeaderActionProps.md)
- [ListFieldLayout](interfaces/ListFieldLayout.md)
- [ListLayout](interfaces/ListLayout.md)
- [PanelComponent](interfaces/PanelComponent.md)
- [PanelComponentProps](interfaces/PanelComponentProps.md)
- [PanelDescription](interfaces/PanelDescription.md)
- [RenderAdminArgs](interfaces/RenderAdminArgs.md)

## Type Aliases

### DescriptionReducer

Ƭ **DescriptionReducer**<`Config`\>: (`prev`: `Config`[]) => `Config`[]

#### Type parameters

| Name     | Type             |
| :------- | :--------------- |
| `Config` | extends `object` |

#### Type declaration

▸ (`prev`): `Config`[]

##### Parameters

| Name   | Type       |
| :----- | :--------- |
| `prev` | `Config`[] |

##### Returns

`Config`[]

#### Defined in

packages/core/admin/dist/admin/src/core/apis/content-manager.d.ts:12

---

### EditFieldLayout

Ƭ **EditFieldLayout**: \{ [K in Attribute.Kind]: EditFieldSharedProps & Object }[`Attribute.Kind`]

Map over all the types in Attribute Types and use that to create a union of new types where the attribute type
is under the property attribute and the type is under the property type.

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentLayout.d.ts:59

---

### HeaderActionDescription

Ƭ **HeaderActionDescription**: `HeaderButtonAction` \| `HeaderSelectAction`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/pages/EditView/components/Header.d.ts:32

---

### InputProps

Ƭ **InputProps**: `InputPropsImpl` \| `EnumerationProps`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:4

---

### SanitizedAdminUser

Ƭ **SanitizedAdminUser**: `Omit`<`AdminUser`, `"password"` \| `"resetPasswordToken"` \| `"roles"`\> & \{ `roles`: `SanitizedAdminRole`[] }

#### Defined in

packages/core/admin/dist/shared/contracts/shared.d.ts:37

---

### Store

Ƭ **Store**: `ReturnType`<typeof `configureStoreImpl`\> & \{ `asyncReducers`: `Record`<`string`, `Reducer`\> ; `injectReducer`: (`key`: `string`, `asyncReducer`: `Reducer`) => `void` }

#### Defined in

packages/core/admin/dist/admin/src/core/store/configure.d.ts:37

## Functions

### Blocker

▸ **Blocker**(): `null` \| `Element`

#### Returns

`null` \| `Element`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:62

---

### Form

▸ **Form**<`TFormValues`\>(`p`): `ReactElement`<`any`, `string` \| `JSXElementConstructor`<`any`\>\>

#### Type parameters

| Name          | Type                                             |
| :------------ | :----------------------------------------------- |
| `TFormValues` | extends [`FormValues`](interfaces/FormValues.md) |

#### Parameters

| Name | Type                                                                                            |
| :--- | :---------------------------------------------------------------------------------------------- |
| `p`  | [`FormProps`](interfaces/FormProps.md)<`TFormValues`\> & \{ `ref?`: `Ref`<`HTMLFormElement`\> } |

#### Returns

`ReactElement`<`any`, `string` \| `JSXElementConstructor`<`any`\>\>

**`Description`**

A form component that handles form state, validation and submission.
It can additionally handle nested fields and arrays. To access the data you can either
use the generic useForm hook or the useField hook when providing the name of your field.

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:40

---

### InputRenderer

▸ **InputRenderer**(`props`): `ReactNode`

This needs to be tested before being exposed as a public API.

#### Parameters

| Name    | Type                                                         |
| :------ | :----------------------------------------------------------- |
| `props` | `InputProps` \| `EnumerationProps` & `RefAttributes`<`any`\> |

#### Returns

`ReactNode`

**`Description`**

A generic form renderer for Strapi forms. Similar to GenericInputs but with a different API.
The entire component is memoized to avoid re-renders in large forms.

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/FormInputs/Renderer.d.ts:9

---

### renderAdmin

▸ **renderAdmin**(`mountNode`, `«destructured»`): `Promise`<`void`\>

#### Parameters

| Name             | Type                                               |
| :--------------- | :------------------------------------------------- |
| `mountNode`      | `null` \| `HTMLElement`                            |
| `«destructured»` | [`RenderAdminArgs`](interfaces/RenderAdminArgs.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/strapi/src/admin.ts:8](https://github.com/strapi/strapi/blob/ae101d23d0/packages/core/strapi/src/admin.ts#L8)

---

### unstable_useDocument

▸ **unstable_useDocument**(`args`, `opts?`): `Object`

#### Parameters

| Name    | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `args`  | `UseDocumentArgs`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `opts?` | `UseQuerySubscriptionOptions` & `UseQueryStateOptions`<`QueryDefinition`<\{ `collectionType`: `string` ; `id?`: `string` ; `model`: `string` ; `params?`: \{ `locale?`: `null` \| `string` } }, `BaseQueryFn`<`string` \| `QueryArguments`, `unknown`, `BaseQueryError`, {}, {}\>, `"ComponentConfiguration"` \| `"ContentTypesConfiguration"` \| `"ContentTypeSettings"` \| `"Document"` \| `"InitialData"`, `Response`, `"contentManagerApi"`\>, `Record`<`string`, `any`\>\> |

#### Returns

`Object`

| Name         | Type                                                                               | Description                                                                               |
| :----------- | :--------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `components` | `ComponentsDictionary`                                                             | These are the schemas of the components used in the content type, organised by their uid. |
| `document?`  | `AnyDocument`                                                                      | -                                                                                         |
| `isLoading`  | `boolean`                                                                          | -                                                                                         |
| `meta?`      | `DocumentMetadata`                                                                 | -                                                                                         |
| `schema?`    | `ContentType`                                                                      | This is the schema of the content type, it is not the same as the layout.                 |
| `validate`   | (`document`: `AnyDocument`) => `null` \| `Record`<`string`, `TranslationMessage`\> | -                                                                                         |

**`Description`**

Returns a document based on the model, collection type & id passed as arguments.
Also extracts its schema from the redux cache to be used for creating a validation schema.

**`Example`**

```tsx
const { id, model, collectionType } = useParams<{
  id: string;
  model: string;
  collectionType: string;
}>();

if (!model || !collectionType) return null;

const { document, isLoading, validate } = useDocument({
  id,
  model,
  collectionType,
  params: { locale: 'en-GB' },
});
const { update } = useDocumentActions();

const onSubmit = async (document: Document) => {
  const errors = validate(document);

  if (errors) {
    // handle errors
  }

  await update({ collectionType, model, id }, document);
};
```

**`See`**

[https://contributor.strapi.io/docs/core/content-manager/hooks/use-document](https://contributor.strapi.io/docs/core/content-manager/hooks/use-document) for more information

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocument.d.ts:61

---

### unstable_useDocumentActions

▸ **unstable_useDocumentActions**(): `Object`

#### Returns

`Object`

| Name          | Type                                                                                                                                                                                                                                                             | Description                                                                                                                                                                                                       |
| :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoClone`   | (`args`: \{ `model`: `string` ; `sourceId`: `string` }) => `Promise`<`OperationResponse`<`Response`\>\>                                                                                                                                                          | **`Description`** Attempts to clone a document based on the provided sourceId. This will return a list of the fields as an error if it's unable to clone. You most likely want to use the `clone` action instead. |
| `clone`       | (`args`: \{ `id`: `string` ; `model`: `string` ; `params?`: `object` }, `document`: `Omit`<`AnyDocument`, `"id"`\>, `trackerProperty?`: \{ `error?`: `unknown` ; `status?`: `string` }) => `Promise`<`OperationResponse`<`Response`\>\>                          | -                                                                                                                                                                                                                 |
| `create`      | (`args`: \{ `model`: `string` ; `params?`: `object` }, `document`: `Omit`<`AnyDocument`, `"id"`\>, `trackerProperty?`: \{ `error?`: `unknown` ; `status?`: `string` }) => `Promise`<`OperationResponse`<`Response`\>\>                                           | -                                                                                                                                                                                                                 |
| `delete`      | (`args`: \{ `collectionType`: `string` ; `id?`: `string` ; `model`: `string` ; `params?`: `object` }, `trackerProperty?`: \{ `error?`: `unknown` ; `status?`: `string` }) => `Promise`<`OperationResponse`<`Response`\>\>                                        | -                                                                                                                                                                                                                 |
| `discard`     | (`args`: \{ `collectionType`: `string` ; `id?`: `string` ; `model`: `string` ; `params?`: `object` }) => `Promise`<`OperationResponse`<`Response`\>\>                                                                                                            | -                                                                                                                                                                                                                 |
| `getDocument` | (`args`: \{ `collectionType`: `string` ; `id?`: `string` ; `model`: `string` ; `params?`: `object` }) => `Promise`<`undefined` \| `Response`\>                                                                                                                   | -                                                                                                                                                                                                                 |
| `publish`     | (`args`: \{ `collectionType`: `string` ; `id?`: `string` ; `model`: `string` ; `params?`: `object` }, `document`: `Partial`<`AnyDocument`\>) => `Promise`<`OperationResponse`<`Response`\>\>                                                                     | -                                                                                                                                                                                                                 |
| `unpublish`   | (`args`: \{ `collectionType`: `string` ; `id?`: `string` ; `model`: `string` ; `params?`: `object` }, `discardDraft?`: `boolean`) => `Promise`<`OperationResponse`<`Response`\>\>                                                                                | -                                                                                                                                                                                                                 |
| `update`      | (`args`: \{ `collectionType`: `string` ; `id?`: `string` ; `model`: `string` ; `params?`: `object` }, `document`: `Partial`<`AnyDocument`\>, `trackerProperty?`: \{ `error?`: `unknown` ; `status?`: `string` }) => `Promise`<`OperationResponse`<`Response`\>\> | -                                                                                                                                                                                                                 |

**`Description`**

Contains all the operations that can be performed on a single document.
Designed to be able to be used anywhere within a Strapi app. The hooks will handle
notifications should the operation fail, however the response is always returned incase
the user needs to handle side-effects.

**`Example`**

```tsx
import { Form } from '@strapi/admin/admin';

const { id, model, collectionType } = useParams<{
  id: string;
  model: string;
  collectionType: string;
}>();
const { update } = useDocumentActions();

const handleSubmit = async (data) => {
  await update({ collectionType, model, id }, data);
};

return <Form method="PUT" onSubmit={handleSubmit} />;
```

**`See`**

[https://contributor.strapi.io/docs/core/content-manager/hooks/use-document-operations](https://contributor.strapi.io/docs/core/content-manager/hooks/use-document-operations) for more information

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentActions.d.ts:100

---

### unstable_useDocumentLayout

▸ **unstable_useDocumentLayout**(`model`): `Object`

#### Parameters

| Name    | Type     |
| :------ | :------- |
| `model` | `string` |

#### Returns

`Object`

| Name        | Type                                     | Description                           |
| :---------- | :--------------------------------------- | :------------------------------------ |
| `edit`      | [`EditLayout`](interfaces/EditLayout.md) | This is the layout for the edit view, |
| `error?`    | `BaseQueryError` \| `SerializedError`    | -                                     |
| `isLoading` | `boolean`                                | -                                     |
| `list`      | [`ListLayout`](interfaces/ListLayout.md) | -                                     |

**`Description`**

This hook is used to get the layouts for either the edit view or list view of a specific content-type
including the layouts for the components used in the content-type. It also runs the mutation hook waterfall so the data
is consistent wherever it is used. It's a light wrapper around the `useDocument` hook, but provides the `skip` option a document
is not fetched, however, it does fetch the schemas & components if they do not already exist in the cache.

If the fetch fails, it will display a notification to the user.

**`Example`**

```tsx
const { model } = useParams<{ model: string }>();
const {
  edit: { schema: layout },
} = useDocumentLayout(model);

return layout.map((panel) => panel.map((row) => row.map((field) => <Field {...field} />)));
```

#### Defined in

packages/core/admin/dist/admin/src/content-manager/hooks/useDocumentLayout.d.ts:121

---

### useField

▸ **useField**<`TValue`\>(`path`): [`FieldValue`](interfaces/FieldValue.md)<`undefined` \| `TValue`\>

#### Type parameters

| Name     | Type  |
| :------- | :---- |
| `TValue` | `any` |

#### Parameters

| Name   | Type     |
| :----- | :------- |
| `path` | `string` |

#### Returns

[`FieldValue`](interfaces/FieldValue.md)<`undefined` \| `TValue`\>

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:61

---

### useForm

▸ **useForm**<`Selected`\>(`consumerName`, `selector`): `Selected`

#### Type parameters

| Name       |
| :--------- |
| `Selected` |

#### Parameters

| Name           | Type                                                                                                                     |
| :------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `consumerName` | `string`                                                                                                                 |
| `selector`     | (`value`: [`FormContextValue`](interfaces/FormContextValue.md)<[`FormValues`](interfaces/FormValues.md)\>) => `Selected` |

#### Returns

`Selected`

#### Defined in

packages/core/admin/dist/admin/src/content-manager/components/Form.d.ts:24

---

### useInjectReducer

▸ **useInjectReducer**(`namespace`, `reducer`): `void`

#### Parameters

| Name        | Type      |
| :---------- | :-------- |
| `namespace` | `string`  |
| `reducer`   | `Reducer` |

#### Returns

`void`

**`Description`**

Inject a new reducer into the global redux-store.

**`Example`**

```tsx
import { reducer } from './local-store';

const MyPlugin = () => {
  useInjectReducer('plugin', reducer);
};
```

#### Defined in

packages/core/admin/dist/admin/src/hooks/useInjectReducer.d.ts:14

---

### useLicenseLimits

▸ **useLicenseLimits**(`«destructured»?`): `Object`

#### Parameters

| Name             | Type                   |
| :--------------- | :--------------------- |
| `«destructured»` | `UseLicenseLimitsArgs` |

#### Returns

`Object`

| Name         | Type                                                                                                                                                                                                                                                                                                                                                                   |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getFeature` | <T\>(`name`: `"review-workflows"` \| `"sso"` \| `"audit-logs"` \| `"cms-content-releases"`) => `Record`<`string`, `T`\> \| `undefined`                                                                                                                                                                                                                                 |
| `isError`    | `boolean`                                                                                                                                                                                                                                                                                                                                                              |
| `isLoading`  | `boolean`                                                                                                                                                                                                                                                                                                                                                              |
| `license`    | \{ `currentActiveUserCount`: `number` ; `enforcementUserCount`: `number` ; `features`: (`SSOFeature` \| `AuditLogsFeature` \| `ReviewWorkflowsFeature` \| `ContentReleasesFeature`)[] ; `isHostedOnStrapiCloud`: `boolean` ; `licenseLimitStatus`: `unknown` ; `permittedSeats`: `number` ; `shouldNotify`: `boolean` ; `shouldStopCreate`: `boolean` } \| `undefined` |

#### Defined in

packages/core/admin/dist/ee/admin/src/hooks/useLicenseLimits.d.ts:4
