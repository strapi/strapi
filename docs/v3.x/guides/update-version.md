# Update Strapi version

How to upgrade your application to the latest version of Strapi.

## Upgrading your dependencies

Start by upgrading all your Strapi package version.

For example moving from `3.0.4` to `3.0.5`

:::: tabs

::: tab 3.0.5

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.5",
    "strapi-admin": "3.0.5",
    "strapi-connector-bookshelf": "3.0.5",
    "strapi-plugin-content-manager": "3.0.5",
    "strapi-plugin-content-type-builder": "3.0.5",
    "strapi-plugin-email": "3.0.5",
    "strapi-plugin-graphql": "3.0.5",
    "strapi-plugin-settings-manager": "3.0.5",
    "strapi-plugin-upload": "3.0.5",
    "strapi-plugin-users-permissions": "3.0.5",
    "strapi-utils": "3.0.5"
  }
}
```

:::

::: tab 3.0.6

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.6",
    "strapi-admin": "3.0.6",
    "strapi-connector-bookshelf": "3.0.6",
    "strapi-plugin-content-manager": "3.0.6",
    "strapi-plugin-content-type-builder": "3.0.6",
    "strapi-plugin-email": "3.0.6",
    "strapi-plugin-graphql": "3.0.6",
    "strapi-plugin-settings-manager": "3.0.6",
    "strapi-plugin-upload": "3.0.6",
    "strapi-plugin-users-permissions": "3.0.6",
    "strapi-utils": "3.0.6"
  }
}
```

:::

::::

Install the specified version:
:::: tabs

::: tab yarn

```bash
yarn install
```

:::

::: tab npm

```bash
npm install
```

:::

::::

::: tip
If the operation doesn't work, you should probably remove your `yarn.lock` or `package-lock.json`. If it still does not work, let's run the hard mode `rm -Rf node_modules`
:::

## Building your administration panel

New releases can introduce changes to the administration panel that require a rebuild.

Start by deleting your current build:

```bash
rm -rf build
```

Build the administration panel:
:::: tabs

::: tab yarn

```bash
yarn build
```

:::

::: tab npm

```bash
npm run build
```

:::

::::

::: tip
If the operation doesn't work, you should probably remove the `.cache` folder too.
:::

## Migration guides

Sometimes Strapi introduces changes that need more than just the previous updates.

That is the reason for the [Migration Guide](../migration-guide/README.md) page.

Just make sure when you update your version that a migration guide exists or not.
