# Technical documentation

This documentation covers how the `<Permissions />` component works.
This component is in charge of managing the permissions of the admin panel, it has 4 children, one child for each tab.
The displayed tabs are:

- Collection Types: this tab allows to set permissions of the CRUD actions for the application's collection types.
- Single Types: similarly, this tab allows to set permissions for the single types.
- Plugins: this tabs allows to define permissions for the installed plugins of the application.
- Settings: this tabs allows to define permissions for the plugins settings. The settings are found in the settings view which is accessible by clicking on the link from the main left menu.

The collection types & single types tabs uses the same component: `<ContentTypes>` similarly, the Plugins & Settings tabs use the `<Plugins>` component.

The UI uses the layout received from the back-end in order to build the UI.

> Endpoint: `/admin/permissions`.

## Props

`<Permissions />` is exported from `@strapi/admin/strapi-admin` (with the types `PermissionsAPI`, `PermissionsProps`, `PermissionsLayout`, `PermissionsRow` and `PermissionsTabId`) so a plugin can edit the permissions of its own roles with it. **This export is experimental:** it is coupled to the admin's role editor and has one consumer (`@strapi/plugin-end-users`), so its props and types may change in a minor release. Every prop below is optional unless stated, and the component renders exactly the admin's role editor when the optional ones are absent.

| Prop                       | Type                                                                                                   | Description                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout` (required)        | `PermissionsLayout`                                                                                    | The layout described below (the answer of `/admin/permissions`).                                                                                                                                                           |
| `permissions`              | `Permission[]`                                                                                         | The permissions the form starts from.                                                                                                                                                                                      |
| `isFormDisabled`           | `boolean`                                                                                              | Disables every checkbox.                                                                                                                                                                                                   |
| `onLocaleValidationChange` | `(hasErrors: boolean) => void`                                                                         | Called when the locale selection becomes valid or invalid.                                                                                                                                                                 |
| `userPermissions`          | `Permission[]`                                                                                         | The permissions of the user editing the form. Checkboxes for permissions the user does not hold are disabled, and bulk selections skip them. Without it nothing is limited.                                                |
| `inheritConditions`        | `boolean`                                                                                              | Admin tokens: conditions are inherited from `userPermissions` and the conditions modal is read-only.                                                                                                                       |
| `permissionsAreStored`     | `boolean`                                                                                              | Whether `permissions` are what the role stores on the server.                                                                                                                                                              |
| `tabLabels`                | `Partial<Record<PermissionsTabId, MessageDescriptor \| null>>`                                         | Replaces the label of a tab (`collectionTypes`, `singleTypes`, `plugins` or `settings`). `null` hides the tab: its permissions are still part of what the form reports. The first tab that is left is the one shown first. |
| `onChange`                 | `(rows: PermissionsRow[]) => void`                                                                     | Called after every change of the form (a reset included, the form as it is first rendered excluded) with the rows `getPermissions()` would send. The latest function passed is the one called.                             |
| `onOpenSubjectChange`      | `(open: { tab: PermissionsTabId; id: string } \| null) => void`                                        | Called when a content type, a plugin or a settings category opens or closes: `id` is the uid of the content type, or the plugin or category key. `null` means none is open, which is also reported when the tab is left.   |
| `renderSubjectActions`     | `(args: { tab: 'collectionTypes' \| 'singleTypes'; subject: string; disabled: boolean }) => ReactNode` | Renders actions in the row of each content type, next to its conditions button. `subject` is the uid of the content type and `disabled` the value of `isFormDisabled`.                                                     |
| `requiredFieldsAction`     | `string`                                                                                               | The id of an action (a `layout` action's `actionId`) that fails unless the role sets every required field. While it is granted on a content type, a warning names the required fields that are not ticked or can't be set. |
| `renderActionIndicator`    | `(args: { actionId: string; subject: string }) => ReactNode`                                           | Renders an indicator (a dot, say) at the top left of the checkbox of an action in the row of each content type. Return `null` for none.                                                                                    |
| `searchable`               | `boolean`                                                                                              | Adds a search to each tab (see "Search and bulk confirmation" below).                                                                                                                                                      |
| `confirmBulkChange`        | `(change: PermissionsBulkChange) => Promise<boolean>`                                                  | Asked before the "select all" of a column applies (see "Search and bulk confirmation" below). Without it the column applies at once.                                                                                       |

The conditions button of a row is not rendered when `layout.conditions` is empty.

The ref gives the `PermissionsAPI`: `getPermissions()`, `hasLocaleValidationErrors()`, `resetForm()` and `setFormAfterSubmit()`. The form is built once from `layout` and `permissions`: remount the component (change its `key`) to load other ones.

### Search and bulk confirmation

Both are opt-in: the Roles page has neither.

- `searchable` puts a search button at the top of each tab, which opens a search box. The text is trimmed and compared without regard to case, as a part of a label. Collection and single types list the content types whose label matches or that have a field (in any property, a group's fields included) or a locked row whose label matches. An open content type lists the fields that match, or every field when its own label matches; a group that is listed because of a field in it opens to the fields that match, or lists all of its fields when its own label matches. Plugins and settings list the categories whose name matches (with everything in them), and otherwise the sub-categories whose name or an action's label matches, which list the actions that match (all of them when the sub-category's name matches). With nothing left the tab says `No content types or fields match “<text>”.` (`plugins or actions` and `settings or actions` in the other two). Each time the text changes, the first content type that has a field (or a locked row) that matches opens, so the match is on screen; a content type listed by its own label alone stays closed, and `onOpenSubjectChange` hears about the one that opens. On the plugins and settings tabs the first category listed opens, unless the one that is open is listed too. Clearing the search leaves the open one as it is. Each tab starts without a search, and leaving a tab drops its search. Searching only decides what is listed: it never reads or changes the form, the required-field warning still looks at every field, and the checkboxes of a group, a sub-category or a content type still cover everything in them. Enter in the search box does not submit the form the editor is in.
- A column checkbox ("select all" of an action, at the top of a content types tab) then shows and changes the listed content types only, and is off when none of them has the action.
- `confirmBulkChange` is called with a `PermissionsBulkChange`, `{ tab, actionId, label, subjects, value, filtered }` (the package does not export the type: read it from `PermissionsProps['confirmBulkChange']`), when a column checkbox is clicked: `label` is the action as the column shows it, `subjects` are the uids of the content types the change applies to (the ones that have the action and are listed), `value` is what they are about to be (`true` grants the action) and `filtered` says a search limits them. The form changes when the promise resolves to `true` and stays as it is otherwise (a promise that rejects changes nothing either, and is left unhandled). It is called for every column change, however few content types it covers: the consumer decides whether to ask anyone. A column clicked again before the answer is in is ignored. The function called is the latest one passed. No other change is asked about: a cell, a row, a content type or a group ticks at once.

### Field rules

A layout can ask for more than the Roles page shows. All of it is optional (see the layout shape below):

- `SubjectProperty.disabledActions` (on a field or a group, which passes it on to its fields): the cell of these actions is off and disabled. The field has no value for the action in the form, so it is in no count, bulk ticks never reach it and the sent list never names it, even when the stored permission does.
- `Subject.locked`: rows with a label and a note and no checkbox, listed under the first matrix of the content type.

These rules apply to the content types that ask for them: with none of these properties in the layout the form, the rows it sends and the Roles page are what they were.

### Empty tabs

A tab with nothing in it says so instead of drawing an empty list, with no search and no column checkboxes. The collection types and single types tabs say `No collection types yet` and `No single types yet`, with a link to the Content-Type Builder; the plugins and settings tabs say `Nothing to set here`. It follows the layout: a tab is empty when the layout lists no content type, no plugin action or no settings action for it.

## Layout shape

```js
const layout = {
  conditions: [{ id: 'string', displayName: 'string', category: 'string'}], // Array of conditions that can be applied on a permission
  sections: {
    plugins: [
      { displayName: 'string', action: 'string', subCategory: 'string', plugin: 'string'}
    ], // For the content types permissions, actions can be CRUD + publish but for plugins and settings sections, it depends. Settings/plugins can have custom actions.
    settings: [], // Same shape as the plugins
    collectionTypes: {
      subjects: [ // Array of subjects, a subject is a collection type
        {
          uid: 'string', // Collection type uid,
          label: 'string', // Collection type label,
          locked: [{ label: 'string', note: 'string' }], // This key is optional: rows without checkboxes, listed under the matrix
          properties: [
            {
              label: 'string', // Property label ex: Fields. By default a collection type always has the fields property, depending on the installed plugins a property can also be Locales.
              value: 'string', // Value of the property ex: fields. (Checkout the examples below.)
              children: [ // This corresponds to the fields that will be displayed
                {
                  label: 'string',
                  value: 'string',
                  required: 'boolean', // This key is optional,
                  disabledActions: [<string>], // This key is optional, the ids of the actions whose cell is off and disabled (a group passes it on to its children),
                  children: [], // This key is optional, if it exists it means that a field has nested fields, the naming can interfere with the React's programmatic API, so in the codebase the key is renamed to `childrenForm`.
                }
              ]
             },
          ]
        }
      ],
      actions: [ // Array of actions they refer to CRUD methods that are available on a content type
        {
          label: 'string', // Label of the action ex: Create,
          actionId: 'string', // id of the action ex: content-manager.explorer.create
          subjects: [<string>], // Array of subjects (collection type uid) on which the action can be applied
          applyToProperties: [<string>] // Array of properties (ex: fields or locales) on which an action can be applied
        }
      ]
    }
  }
}
```

---

## Concepts

- Checkbox: has only 1 `checked=true` or `checked=false`.

- Parent checkbox: A **parent checkbox** is a checkbox which the state value depends on the state of its children ones. It means that the value cannot directly be accessed from the `modifiedData` object.
  Such checkbox has 2 props in order to indicate the user if all the children checkboxes are checked or some of them are checked:
  - someChecked: `true` or `false`,
  - checked: `true` of `false`
    > Both states are coupled: if `someChecked=true` then `checked=false`.
    > In terms of user's interaction when cliking a parent checkbox it will toggle the value of its children.

Ex: given the following data:

```js
const modifiedData = {
  address: {
    create: {
      fields: { f1: true, f2: true,}
      locales: { en: false, fr: false}
    },
    update: {
      enabled: true,
    }
  }
}
```

From the `modifiedData` object, 4 parent checkboxes can be identified:

1. `address` which value depends on the values of `address.create` & `address.update` here the state will be: `someChecked=true`
2. `create` which value depends on the values of `address.create.fields` & `address.create.locales` here the state will be: `someChecked=true, checked=true`
3. `fields` which value depends on the values of `address.create.fields.f1` & `address.create.fields.f2` here the state will be: `checked=true`
4. `locales` which value depends on the values of `address.create.locales.en` & `address.create.locales.fr` here the state will be `checked=false, someChecked=false`

> `address.update` is not a parent checkbox since we can access its value directly `address.update.enabled`

---

## Components architecture

### `<Permissions />` architecture

```js
<PermissionsDataManagerProvider>
  <Tabs>
    <ContentTypes /> // Used with the `layout.sections.collectionTypes` data, the keys are hardcoded
    in the DOM directly
    <ContentTypes /> // Used with the `layout.sections.singleTypes` data
    <PluginsAndSettings /> // Used with the `layout.sections.settings` data
    <PluginsAndSettings /> // Used with the `layout.sections.plugins` data
  </Tabs>
</PermissionsDataManagerProvider>
```

Below, is the architecture of the `<Permissions />` component:

```js
<ContentTypes>
  <GlobalActions /> // Component in charge of displaying the global action checkboxes (parent
  checkboxes), they are used to toggle all the checkboxes of the associated column
  <ContentTypeCollapses>
    {' '}
    // Wrapper or the collapse and the matrix
    <ContentTypeCollapse>
      <Collapse /> // Main row of a content type => Displays the main actions of a content type
      (parent checkboxes)
      <CollapsePropertyMatrix>
        {' '}
        // Matrix of the actions subject property
        <Header /> // Row that displays the actions labels inside a property (ex: create, read,
        update)
        <ActionRow>
          {' '}
          // Displays a subject's property values
          <SubActionRow /> // Recursive component if a property has a children key, the component
          will return itself
        </ActionRow>
      </CollapsePropertyMatrix>
    </ContentTypeCollapse>
  </ContentTypeCollapses>
</ContentTypes>
```

### Building the matrix layout

In order to build the layout, the components use the `sections.collectionTypes.subjects` value received from the API.

#### Retrieving the actions to display in the `<GlobalActions />`

This section covers the logic defined in order to display a global checkbox like the `create` one. Each global action, is considered as a parent checkbox since their purpose is to check or uncheck all the checkboxes that are located below them.

Pratical example:

```js
// layout.sections.collectionTypes.actions
const actions = [
  {
    label: 'Create',
    actionId: 'content-manager.explorer.A1',
    subjects: ['address', 'restaurant'],
    applyToProperties: ['fields', 'locales',],
  },
  {
    label: 'Read',
    actionId: 'content-manager.explorer.read',
    subjects: ['address'],
    applyToProperties: ['fields'],
  },
  {
    label: 'Delete',
    actionId: 'content-manager.explorer.delete',
    subjects: ['restaurant'],
  }
  {
    label: 'Publish',
    actionId: 'content-manager.explorer.publish',
    subjects: [],
  }
]
```

The UI only displays CRUD actions that can be applied to a subject (a content type). The `subjects` array of the `Publish` action is empty, so this action is not applied to any subject. Consequently, the UI only displays the `create`, `read` and `delete` actions.

#### Building the content type's matrix

Using the actions defined above and the following data:

```js
// layout.sections.collectionTypes.subjects
const subjects = [
  {
    uid: 'address',
    label: 'Address'
    properties: {
      {
        label: 'Fields',
        value: 'fields',
        children: [
          {value: 'f1', label: 'F1'},
        ]
      }
    }
  },
  {
    uid: 'restaurant',
    label: 'Restaurant',
    properties: [
      {
        label: 'Fields',
        value: 'fields',
        children: [
          {
            label: 'F1',
            value: 'f1',
            children: [
              {
                label: 'F11',
                value: 'f11',
                children: [
                  { label: 'F111', value: 'f111' }
                ]
              }
            ]
          },
          { label: 'F2', value: 'f2' }
        ]
      },
      {
        label: 'Locales',
        value: 'locales',
        children: [{ label: 'en', value: 'en'}, { label: 'fr', value: 'fr' }]
      }
    ]
  }
]
```

With this layout the ui will look like the following: (`[]` represents a checkbox )

|               | [] Create  | [] Read  | [] Delete | `<GlobalActions />` | Parent Wrapper: `<ContentTypes />`           |
| ------------- | ---------- | -------- | --------- | ------------------- | -------------------------------------------- |
| [] Address    | []         | []       |           | `<Collapse />`      | Parent Wrapper: `<ContentTypeCollapse />`    |
| **Fields**    | **Create** | **Read** |           | `<Header />`        | Parent Wrapper: `<CollapsePropertyMatrix />` |
| [] F1         | []         | []       |           | `<ActionRow />`     | Parent Wrapper: `<CollapsePropertyMatrix />` |
|               |            |          |           |                     |                                              |
| [] Restaurant | [] Create  | [] Read  | [] Delete | `<Collapse />`      | Parent Wrapper: `<CollapsePropertyMatrix />` |
| **Fields**    | **Create** |          |           | `<Header />`        | Parent Wrapper: `<CollapsePropertyMatrix />` |
| [] F1         | []         |          |           | `<ActionRow />`     | Parent Wrapper: `<CollapsePropertyMatrix />` |
| F1.F11        | []         |          |           | `<SubActionRow />`  | Parent Wrapper: `<ActionRow />`              |
| F1.F11.F111   | []         |          |           | `<SubActionRow />`  | Parent Wrapper: `<SubActionRow />`           |
| [ ] F2        | []         |          |           | `<ActionRow />`     | Parent Wrapper: `<CollapsePropertyMatrix />` |
| **Locales**   | **Create** | **Read** |           | `<Header />`        | Parent Wrapper: `<CollapsePropertyMatrix />` |
| [ ] EN        | []         | []       |           | `<ActionRow />`     | Parent Wrapper: `<CollapsePropertyMatrix />` |
| [ ] FR        | []         | []       |           | `<ActionRow />`     | Parent Wrapper: `<CollapsePropertyMatrix />` |

#### Shape of the `modifiedData.collectionTypes` object:

In order to easily know the state of a checkbox, the `modifiedData` is built using the `layout.sections.collectionTypes` to generate the following shape:

```js
const conditions = [
  {
    id: 'admin::is-creator',
    displayName: 'Is creator',
    category: 'default',
  },
  {
    id: 'admin::has-same-role-as-creator',
    displayName: 'Has same role as creator',
    category: 'default',
  },
];
const collectionTypesDefaultForm = createDefaultCTFormFromLayout(layout.sections.collectionTypes, action, conditions)
// createDefaultCTFormFromLayout returns an object with all the values set to  false.
// Using the data from above it will return

console.log(collectionTypesDefaultForm)

{
  address: {
    'content-manager.explorer.create': {
      fields: {
        f1: false,
      },
      conditions: {
        'admin::is-creator': false,
        'admin::has-same-role-as-creator': false
      }
    },
    'content-manager.explorer.read': {
      fields: {
        f1: false,
      },
      conditions: {
        'admin::is-creator': false,
        'admin::has-same-role-as-creator': false
      }
    },
  },
  restaurant: {
    'content-manager.explorer.create': {
      fields: {
        f1: {
          f11: {
            f111: false
          },
        },
        f2: false
      },
      locales: { en: false, fr: false},
      conditions: {
        'admin::is-creator': false,
        'admin::has-same-role-as-creator': false
      }
    },
    'content-manager.explorer.delete: {
      enabled: false,
      conditions: {
        'admin::is-creator': false,
        'admin::has-same-role-as-creator': false
      }
    },
  },
};
```

#### Getting the state of a checkbox using the `modifiedData` object

Examples:

- The `create` checkbox located in the `<GlobalActions />` component is a **parent checkbox** therefore, it's value depends on its children ones. Since, this checkbox is related the `content-manager.explorer.create` action we need to know the values of:
  - `address['content-manager.explorer.create'].fields.f1`
  - `restaurant['content-manager.explorer.create'].fields.f1.f11.f111`
  - `restaurant['content-manager.explorer.create'].fields.f2`
  - `restaurant['content-manager.explorer.create'].locales.en`
  - `restaurant['content-manager.explorer.create'].locales.fr`

> The `conditions` key is not a property of an action so the value of `create` does not depend on it

A way to dynamically retrieve the state of the `create` checkbox, is to create the following object:

```js
const objectToRetrieveTheStateOfTheCreateCheckbox = {
  address: {
    fields: { f1: false },
  },
  restaurant: {
    fields: {
      f1: { f11: { f111: false } },
      f2: false,
    },
    locales: { en: false, fr: false },
  },
};
```

In order to know is all the properties are `false` or if some of them are `true`, an array of `Boolean` values could be created from the object.

```js
const arrayOfPermissionLeafsBooleanValues = [
  false, // address.fields.f1
  false, // restaurant.field.f1.f11.f111,
  false, // restaurant.fields.f2,
  false, // restaurant.locales.en
  false, // restaurant.locales.fr
];

const checkboxCreateState = { someChecked: false, allChecked: false };
```
