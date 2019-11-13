# Migration guide from beta.16.8 through beta.17.4 to beta.17.5

Upgrading your Strapi application to `v3.0.0-beta.17.5`.

## Upgrading your dependencies

Start by upgrading your dependencies. Make sure to use exact versions.

::: danger
`strapi-plugin-settings-manager` has been deprecated. you need to remove it from your `package.json`.
:::

Your package.json should look like this:

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.17.5",
    "strapi-admin": "3.0.0-beta.17.5",
    "strapi-hook-bookshelf": "3.0.0-beta.17.5",
    "strapi-hook-knex": "3.0.0-beta.17.5",
    "strapi-plugin-content-manager": "3.0.0-beta.17.5",
    "strapi-plugin-content-type-builder": "3.0.0-beta.17.5",
    "strapi-plugin-email": "3.0.0-beta.17.5",
    "strapi-plugin-upload": "3.0.0-beta.17.5",
    "strapi-plugin-users-permissions": "3.0.0-beta.17.5",
    "strapi-utils": "3.0.0-beta.17.5"
  }
}
```

Then run either `yarn install` or `npm install`.

## Rebuilding your administration panel

Now delete the `.cache` and `build` folders. Then run `yarn develop` or `npm run develop`.
