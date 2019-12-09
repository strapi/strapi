# Migration guide from beta.18 through beta.17.8 to beta.18

Upgrading your Strapi application to `v3.0.0-beta.18`.

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

The file model has been update. The `size` field is now a decimal number, allowing correct sorting behavior.

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

Components now are placed into `categories`. To reflect this you must move all your components must live inside a `category` folder.

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

## Rebuilding your administration panel

Now delete the `.cache` and `build` folders. Then run `yarn develop`.
