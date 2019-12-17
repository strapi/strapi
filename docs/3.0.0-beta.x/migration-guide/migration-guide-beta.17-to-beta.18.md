# Migration guide from beta.18 through beta.17.8 to beta.18

Upgrading your Strapi application to `v3.0.0-beta.18`.

**Make sure your server is not running until then end of the migration**

## Upgrading your dependencies

Start by upgrading your dependencies. Make sure to use exact versions.

::: danger
Starting from beta.18 the database packages have been changed to allow future changes.

- `strapi-hook-knex` has been removed and merged into the `bookshelf` database connector.
- `strapi-hook-bookshelf` is renamed `strapi-connector-bookshelf`.
- `strapi-hook-mongoose` is renamed `strapi-connector-mongoose`.

:::

Update your package.json accordingly:

**Before**

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.17.4",
    "strapi-admin": "3.0.0-beta.17.4",
    "strapi-hook-bookshelf": "3.0.0-beta.17.4", // rename to strapi-connector-bookshelf
    "strapi-hook-knex": "3.0.0-beta.17.4", // remove
    "strapi-plugin-content-manager": "3.0.0-beta.17.4",
    "strapi-plugin-content-type-builder": "3.0.0-beta.17.4",
    "strapi-plugin-email": "3.0.0-beta.17.4",
    "strapi-plugin-graphql": "3.0.0-beta.17.4",
    "strapi-plugin-upload": "3.0.0-beta.17.4",
    "strapi-plugin-users-permissions": "3.0.0-beta.17.4",
    "strapi-utils": "3.0.0-beta.17.4"
  }
}
```

**After**

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.18",
    "strapi-admin": "3.0.0-beta.18",
    "strapi-connector-bookshelf": "3.0.0-beta.18",
    "strapi-plugin-content-manager": "3.0.0-beta.18",
    "strapi-plugin-content-type-builder": "3.0.0-beta.18",
    "strapi-plugin-email": "3.0.0-beta.18",
    "strapi-plugin-graphql": "3.0.0-beta.18",
    "strapi-plugin-upload": "3.0.0-beta.18",
    "strapi-plugin-users-permissions": "3.0.0-beta.18",
    "strapi-utils": "3.0.0-beta.18"
  }
}
```

Then run either `yarn install` or `npm install`.

## Database configuration

Now that you have installed the new database package. You need to update your `database.json` configuration files located in `./config/environments/{env}/database.json`.

You can now only use the connector name instead of the complete package name.

**Before**

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "strapi-hook-bookshelf",
      "settings": {
        //...
      },
      "options": {}
    }
  }
}
```

**After**

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "bookshelf",
      "settings": {
        //...
      },
      "options": {
        //...
      }
    }
  }
}
```

## `ctx.state.user`

Previously the ctx.state.user was populated with the user informations, its role and permissions. To avoid perfromance issues the role is the only populated relation on the user by default.

## File model

The file model has been updated. The `size` field is now a decimal number, allowing correct sorting behavior.

You will need to clear some database indexes if you are using either Mysql or PostgreSQL.

:::: tabs

::: tab Mysql

Run the following statement in your database:

`DROP INDEX SEARCH_UPLOAD_FILE ON upload_file;`

:::
::: tab PostgreSQL

Run the following statement in your database:

`DROP INDEX search_upload_file_size;`

:::
::::

## Groups become Components

If you were using the groups feature you will need to apply some changes:

Start by renaming the `./groups` folder to `./components` in your project root folder.

Components now are placed into `categories`. To reflect this you must move your components inside `category` folders.

::: danger
Make sure to use `-` in your file names (Do not use spaces or underscores).
:::

### Example

**Before**

```
groups/
├── seo-metadata.json
└── image-text.json
```

**After**

```
components/
├── seo/
│   └── metadata.json
└── content/
    └── image-text.json
```

Now that you have moved your component into categories. You need to update your content-types to reference them correctly.

**Before**
`./api/restaurant/models/Restaurant.settings.json`

```json
{
  "connection": "default",
  "collectionName": "restaurants",
  "info": {
    "name": "restaurant",
    "description": ""
  },
  "options": {
    "increments": true,
    "timestamps": ["created_at", "updated_at"]
  },
  "attributes": {
    "title": {
      "type": "string"
    },
    "seo_metadatas": {
      "type": "group",
      "group": "seo-metadata",
      "repeatable": true
    },
    "cover": {
      "type": "group",
      "group": "image-text"
    }
  }
}
```

**After**
`./api/restaurant/models/Restaurant.settings.json`

```json
{
  "connection": "default",
  "collectionName": "restaurants",
  "info": {
    "name": "restaurant",
    "description": ""
  },
  "options": {
    "increments": true,
    "timestamps": ["created_at", "updated_at"]
  },
  "attributes": {
    "title": {
      "type": "string"
    },
    "seo_metadatas": {
      "type": "component",
      "component": "seo.metadata", // {category}.{name}
      "repeatable": true
    },
    "cover": {
      "type": "component",
      "component": "content.image-text"
    }
  }
}
```

### Database migration of groups

::: warning
Make sure to do a database backup before your migration.
:::

Those migration are only necessary if you have data in production. Otherwise you should simply recreate your db.
To keep your preferences you can backup the `core_store` table data.

#### Bookshelf

Some database changes have occured:

- Component join tables have been renamed from `{content_type}_groups` to `{content_type}_components`.
- Component join tables column `group_type` is renamed to `component_type`.
- Component join tables column `group_id` is renamed to `component_id`.

**Migration queries**

Make sure to run those queries for the tables that exist in your database.

_`Queries for a Restaurant content type`_
:::: tabs

::: tab Sqlite

```sql
-- renaming the table
ALTER TABLE restaurants_groups
RENAME TO restaurants_components;

-- renaming the columns
ALTER TABLE restaurants_components
RENAME COLUMN group_type to component_type;

ALTER TABLE restaurants_components
RENAME COLUMN group_id to component_id;
```

:::

::: tab Postgres

```sql
-- renaming the table
ALTER TABLE restaurants_groups
RENAME TO restaurants_components;

-- renaming the columns
ALTER TABLE restaurants_components
RENAME COLUMN group_type to component_type;

ALTER TABLE restaurants_components
RENAME COLUMN group_id to component_id;
```

:::

::: tab Mysql

```sql
-- renaming the table
RENAME TABLE restaurants_groups TO restaurants_components;


-- renaming the columns
ALTER TABLE restaurants_components
RENAME COLUMN group_type to component_type;

ALTER TABLE restaurants_components
RENAME COLUMN group_id to component_id;
```

:::

::::

---

You might notice that you still have some tables with a name containing the `group` keyword. Those are the tables that contain the groups data.

If you want to rename them you have 3 steps to follow:

**1. Rename the table in your DB (you can use the table renaming query shown above).**

:::: tabs
::: tab Sqlite

```sql
ALTER TABLE groups_old_table_name
RENAME TO components_new_table_name;
```

:::
::: tab Postgres

```sql
ALTER TABLE groups_old_table_name
RENAME TO components_new_table_name;
```

:::
::: tab Mysql

```sql
-- renaming the table
RENAME TABLE groups_old_table_name TO components_new_table_name;
```

:::
::::

**2. Change the `collectionName` of the component**

**Before**
`./api/components/category/component.json`

```json
{
  "collectionName": "groups_old_table_name"
  //...
}
```

**After**
`./api/components/category/component.json`

```json
{
  "collectionName": "components_new_table_name"
  //....
}
```

**3. Update the `component_type` values in the join tables**

_Repeat this query for every join table where you are using this component._

```sql
UPDATE restaurant_components
SET component_type = 'groups_old_table_name'
WHERE component_type = 'components_new_table_name';
```

#### Mongo

In `mongo` the relation between a content type and its components is held in an array of references. To know which component type it referes to, the array also contains a `kind` attribute containing the component Schema name.

**How to migrate**

**1. Get your new global ids**

The `kind` attribute references the Strapi `globalId` of a model. To get your component global ids run:

```sh
strapi console
```

```js
Object.keys(strapi.components).map(key => strapi.components[key].globalId);
//[
// 'ComponentCategoryMyComponent',
// 'ComponentCategoryMyOtherComponent',
//]
```

**2. Rename the component collections**

```js
// renaming a collection groups_my_group
db.collection.renameCollection('groups_my_group', 'components_my_component');
```

**3. Change the `collectionName` of the component**

**Before**
`./api/components/category/component.json`

```json
{
  "collectionName": "groups_old_table_name"
  //...
}
```

**After**
`./api/components/category/component.json`

```json
{
  "collectionName": "components_new_table_name"
  //....
}
```

**4. Rename the `kind` attributes**

To know the old `kind` name of a group here is the function that creates it:

```js
toGlobalId = name => upperFirst(camelCase(`group_${name}`));
// my-group => GroupMyGroup
```

**Query to update the kind for on filed in one contentType**:

```js
db.getCollection('contentTypeCollection').update(
  { 'componentField.kind': 'GroupsMyGroup' },
  { $set: { 'componentField.$.kind': 'ComponentCategoryMyComponent' } },
  { multi: true }
);
```

## Adding new root page files

We created new home pages when your go to your api url.
You will need to copy `index.html` and `production.html` into your `public` folder.
You can find those two files [here](https://github.com/strapi/strapi/tree/master/packages/strapi-generate-new/lib/resources/files/public).

## Rebuilding your administration panel

Now delete the `.cache` and `build` folders. Then run `yarn develop`.
