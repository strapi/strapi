# Migration guide from beta.16.8 through beta.17.3 to beta.17.4

Upgrading your Strapi application to `v3.0.0-beta.17.4`.

## Upgrading your dependencies

Start by upgrading your dependencies. Make sur to use exact versions.

::: danger
`strapi-plugin-settings-manager` has been deprecated. you need to remove it from your `package.json`.
:::

Your package.json should look like this:

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.17.4",
    "strapi-admin": "3.0.0-beta.17.4",
    "strapi-hook-bookshelf": "3.0.0-beta.17.4",
    "strapi-hook-knex": "3.0.0-beta.17.4",
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

Then run either `yarn install` or `npm install`.

## Rebuilding your administration panel

Now delete the `.cache` and `build` folders. Then run `yarn develop`.
