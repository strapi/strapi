# Update Strapi version

With this guide you will know how to upgrade your application to the latest version of Strapi.

::: tip NOTE
When a new version of Strapi is available, you will be notified both in your terminal, and in the admin panel. <br>
Also note that you can check the **Settings > Application** section of the admin panel to have more information on:

- The versions of Strapi and Node you are currently using.
- If relevant, the versions we recommend you to upgrade to.

:::

::: warning CAUTION
Before you start, make sure your server is not running until the end of the guide!
:::

## Upgrade your dependencies

Start by upgrading all your Strapi packages in your `package.json`.<br>
For example upgrading from `3.2.4` to `3.2.5`:

:::: tabs

::: tab 3.2.4

```json
{
  //...
  "dependencies": {
    "strapi": "3.2.4",
    "strapi-admin": "3.2.4",
    "strapi-connector-bookshelf": "3.2.4",
    "strapi-plugin-content-manager": "3.2.4",
    "strapi-plugin-content-type-builder": "3.2.4",
    "strapi-plugin-email": "3.2.4",
    "strapi-plugin-graphql": "3.2.4",
    "strapi-plugin-upload": "3.2.4",
    "strapi-plugin-users-permissions": "3.2.4",
    "strapi-utils": "3.2.4"
    //...
  }
}
```

:::

::: tab 3.2.5

```json
{
  //...
  "dependencies": {
    "strapi": "3.2.5",
    "strapi-admin": "3.2.5",
    "strapi-connector-bookshelf": "3.2.5",
    "strapi-plugin-content-manager": "3.2.5",
    "strapi-plugin-content-type-builder": "3.2.5",
    "strapi-plugin-email": "3.2.5",
    "strapi-plugin-graphql": "3.2.5",
    "strapi-plugin-upload": "3.2.5",
    "strapi-plugin-users-permissions": "3.2.5",
    "strapi-utils": "3.2.5"
    //...
  }
}
```

:::

::::

After editing the file run either `yarn install` or `npm install` to install the specified version.

::: tip
If the operation doesn't work, you should probably remove your `yarn.lock` or `package-lock.json`. If it still does not work, try again after also removing the folder `node_modules`.
:::

## Rebuild your administration panel

New releases can introduce changes to the administration panel that require a rebuild.
Rebuild the admin panel with one of the following commands:

```bash
yarn build --clean
# or
npm run build -- --clean
```

## Extensions

If you are using [extensions](../concepts/customization.md) to create custom code or modify existing code, you will need to update your code and compare your version to the new changes on the repository. Not updating your extensions can **break your app** in unexpected ways we cannot predict.

## Migration guides

Sometimes Strapi introduces **breaking changes** that need more than just the previous steps.
That is the reason for the [Migration guides](../migration-guide/README.md) page.
Just make sure when you update your version that a migration guide exists or not.

## Start your application

If you have followed the information above, you can start your application with:

```bash
yarn develop
# or
npm run develop
```

🎉 Congrats, your application has been migrated!
