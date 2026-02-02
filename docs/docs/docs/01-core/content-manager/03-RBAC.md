---
title: RBAC
description: How RBAC work with documents in the content-manager
tags:
  - content-manager
  - RBAC
  - edit-view
  - documents
---

:::note
This is not a detailed breakdown of permissions within strapi, if you're looking for this you should look at [Permissions Intro](../admin/02-permissions/00-intro.mdx).
:::

Each document's permission's object will contain `properties.fields` which is an array of strings, we can use these to understand which properties can be created / updated etc. Via the subject of the permission.

```json
// An example permission object
{
  "id": 666,
  "action": "plugin::content-manager.explorer.create",
  "actionParameters": {},
  "subject": "api::article.article",
  "properties": {
    "fields": ["short_text", "blocks", "single_compo.name", "single_compo.test", "dynamiczone"]
  },
  "conditions": []
}
```

The above permissions relate to what fields the user can create on the article content-type. The list of fields are their names in the schema, not their labels (which can be overridden in the EditViewSettings), components are dot separated paths where the component name will be the first part of said path, repeatable compoenents **will not** have indexes in the path and finally, in dynamic zones all fields are always allowed.

## DocumentRBAC Component

The `DocumentRBAC` component wraps the ListView & EditView pages providing

- if a user can `create/read/update/delete/publish` a document at all
- the list of fields for each action
- a utility function to check if a user `canAction`

```ts
interface DocumentRBACContextValue {
  canCreate?: boolean;
  canCreateFields: string[];
  canDelete?: boolean;
  canPublish?: boolean;
  canRead?: boolean;
  canReadFields: string[];
  canUpdate?: boolean;
  canUpdateFields: string[];
  canUserAction: (
    fieldName: string,
    fieldsUserCanAction: string[],
    fieldType: Attribute.Kind
  ) => boolean;
  isLoading: boolean;
}
```

:::note
Because the `useRBAC` hook fetches data from the API to check against `conditions` of a permission, we optionally have the `isLoading` returned incase a component needs to await this.
:::

Using all this information, we can disabled & hide fields in the application based on the user's permissions.
