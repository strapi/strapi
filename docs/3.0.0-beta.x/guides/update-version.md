# Update Strapi version

How to upgrade your application to the latest version of Strapi.

## Upgrading your dependencies

Start by upgrading all your strapi package version.

For example moving from `3.0.0-beta.16` to `3.0.0-beta.17`

:::: tabs

::: tab 3.0.0-beta.16

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.16",
    "strapi-admin": "3.0.0-beta.16",
    "strapi-hook-bookshelf": "3.0.0-beta.16",
    "strapi-hook-knex": "3.0.0-beta.16",
    "strapi-plugin-content-manager": "3.0.0-beta.16",
    "strapi-plugin-content-type-builder": "3.0.0-beta.16",
    "strapi-plugin-email": "3.0.0-beta.16",
    "strapi-plugin-graphql": "3.0.0-beta.16",
    "strapi-plugin-settings-manager": "3.0.0-beta.16",
    "strapi-plugin-upload": "3.0.0-beta.16",
    "strapi-plugin-users-permissions": "3.0.0-beta.16",
    "strapi-utils": "3.0.0-beta.16"
  }
}
```

:::

::: tab 3.0.0-beta.17

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.17",
    "strapi-admin": "3.0.0-beta.17",
    "strapi-hook-bookshelf": "3.0.0-beta.17",
    "strapi-hook-knex": "3.0.0-beta.17",
    "strapi-plugin-content-manager": "3.0.0-beta.17",
    "strapi-plugin-content-type-builder": "3.0.0-beta.17",
    "strapi-plugin-email": "3.0.0-beta.17",
    "strapi-plugin-graphql": "3.0.0-beta.17",
    "strapi-plugin-settings-manager": "3.0.0-beta.17",
    "strapi-plugin-upload": "3.0.0-beta.17",
    "strapi-plugin-users-permissions": "3.0.0-beta.17",
    "strapi-utils": "3.0.0-beta.17"
  }
}
```

:::

::::

Then run either `yarn install` or `npm install` to install the specified version.

::: tip
If the operation doesn't work, you should probably remove your `yarn.lock` or `package-lock.json`. And if it still not work let's run the hard mode `rm -Rf node_modules`
:::

## Building your administration panel

New release can introduces changes to the administration panel that require a rebuild.

Start by deleting your current build:

```bash
rm -rf build
```

Build the administration panel:

```bash
yarn build
# or
npm run build
```

::: tip
If the operation doesn't work, you should probably remove the `.cache` folder too.
:::

## Migration guides

Sometimes Strapi introduces changes that need more than just the previous updates.

That is the reason of the [Migration Guide](../migration-guide/README.md) page.

Just make sure when you update your version that a migration guide exist or not.
