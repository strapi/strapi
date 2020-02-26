# Migration guide from beta.18.x to beta.19

Upgrading your Strapi application to `v3.0.0-beta.19`.

**Make sure your server is not running until then end of the migration**

## Upgrading your dependencies

Start by upgrading your dependencies. Make sure to use exact versions.

Update your package.json accordingly:

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.19",
    "strapi-admin": "3.0.0-beta.19",
    "strapi-connector-bookshelf": "3.0.0-beta.19",
    "strapi-plugin-content-manager": "3.0.0-beta.19",
    "strapi-plugin-content-type-builder": "3.0.0-beta.19",
    "strapi-plugin-email": "3.0.0-beta.19",
    "strapi-plugin-graphql": "3.0.0-beta.19",
    "strapi-plugin-upload": "3.0.0-beta.19",
    "strapi-plugin-users-permissions": "3.0.0-beta.19",
    "strapi-utils": "3.0.0-beta.19"
  }
}
```

Then run either `yarn install` or `npm install`.

## Policies syntax change

## Rebuilding your administration panel

Now delete the `.cache` and `build` folders. Then run `yarn develop`.
