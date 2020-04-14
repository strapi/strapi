# Migration guide from beta.19.x to beta.19.4

Upgrading your Strapi application to `v3.0.0-beta.19.4`.

**Make sure your server is not running until then end of the migration**

## Upgrading your dependencies

Start by upgrading your dependencies. Make sure to use exact versions.

Update your package.json accordingly:

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.19.4",
    "strapi-admin": "3.0.0-beta.19.4",
    "strapi-connector-bookshelf": "3.0.0-beta.19.4",
    "strapi-plugin-content-manager": "3.0.0-beta.19.4",
    "strapi-plugin-content-type-builder": "3.0.0-beta.19.4",
    "strapi-plugin-email": "3.0.0-beta.19.4",
    "strapi-plugin-graphql": "3.0.0-beta.19.4",
    "strapi-plugin-upload": "3.0.0-beta.19.4",
    "strapi-plugin-users-permissions": "3.0.0-beta.19.4",
    "strapi-utils": "3.0.0-beta.19.4"
  }
}
```

Then run either `yarn install` or `npm install`.

## Route syntax changes

In order to stay database agnostic, we decided that the identifier in url params should always be named `id`.

If your routes configuration still use something else than `id`, please modify all of them as in the following example.

### Example

**Before -** `./api/**/config/routes.json`

```json
{
  "method": "PUT",
  "path": "/assets/:_id",
  "handler": "Asset.update",
  "config": {
    "policies": []
  }
}
```

**After -** `./api/**/config/routes.json`

```json
{
  "method": "PUT",
  "path": "/assets/:id",
  "handler": "Asset.update",
  "config": {
    "policies": []
  }
}
```

## Listened host changed

Before beta.19.4, Strapi was listening to `0.0.0.0` (which means it listened to all network interfaces) no matter what was specified in the config file `server.js`.

As of beta.19.4, Strapi listens only to the host specified in the config (which is most often `localhost` or `127.0.0.1`).

In some cases (with Heroku, Docker...), listening to `localhost` won't work. In that case, you need to edit your config to specify the correct host to listen to: a specific one if you know it or `0.0.0.0` otherwise.

### Example

**After -** `./config/environments/**/server.js`

```json
{
  "host": "localhost",
  "port": 1337
}
```

**After -** `./config/environments/**/server.js`

```json
{
  "host": "0.0.0.0",
  "port": 1337
}
```

## Rebuilding your administration panel

Now delete the `.cache` and `build` folders. Then run `yarn develop`.
