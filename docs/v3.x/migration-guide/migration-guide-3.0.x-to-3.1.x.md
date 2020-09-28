# Migration guide from 3.0.x to 3.1.x

**Make sure your server is not running until the end of the migration**

:::warning
If you are using **extensions** to create custom code or modifying existing code, you will need to update your code and compare your version to the new changes on the repository.
<br>
Not updating your **extensions** can break your app in unexpected ways that we cannot predict.
:::

## Summary

[[toc]]

## 1. Upgrading your dependencies

First, run the following command to get the last version of `3.1.x`:

```bash
npm info strapi@3.1.x version
```

Then, update your `package.json` with the highest version given by the previous command.

**Example —** `package.json`

```json
{
  // ...
  "dependencies": {
    "strapi": "$version",
    "strapi-admin": "$version",
    "strapi-connector-bookshelf": "$version",
    "strapi-plugin-content-manager": "$version",
    "strapi-plugin-content-type-builder": "$version",
    "strapi-plugin-email": "$version",
    "strapi-plugin-graphql": "$version",
    "strapi-plugin-upload": "$version",
    "strapi-plugin-users-permissions": "$version",
    "strapi-utils": "$version"
  }
}
```

:::tip NOTE
Make sure to replace `$version` with the highest version given by the previous command.
:::

Finally, update your `dependencies` with one of the following commands:

```bash
yarn install
# or
npm install
```

## 2. Define the admin JWT Token

This version comes with a new feature: Role & Permissions for the administrators. In the process, the authentication system for administrators has been updated and the `secret` used to encode the jwt token is not automatically generated anymore.
In order to make the login work again you need to define the `secret` you want to use in `server.js`.

**Example**

1. Generate a secure token.

```bash
openssl rand 64 | base64 # (linux/macOS users)
# or
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))" # (all users)
```

2. Add it to you env variables (for example in `.env`).

`.env`

```bash
ADMIN_JWT_SECRET=token_generated_above
```

3. Add it to your config file.

`config/server.js`

```js
module.exports = ({ env }) => ({
  // ...
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
  },
});
```

You're done!

:::tip NOTE
All currently logged in administrators will be disconnected from the app and will need to log in again.
:::

## 3. Update `username` constraint for administrators

The `username` field is no longer required for administrator users.

You will have to remove the `NOT NULL` constraint for this column in your database.

## 4. Migrate your custom admin panel plugins

If you don't have custom plugins, you can jump to the next section.

In order to display your custom plugin link into the mail `LeftMenu` you need to update the plugin registration by adding `icon`, `name` and `menu` in the following file.

**Path —** `plugins/${pluginName}/admin/src/index.js`

```js
export default strapi => {
  // ...
  const icon = pluginPkg.strapi.icon;
  const name = pluginPkg.strapi.name;
  const plugin = {
    // ...
    icon,
    name,
    menu: {
      // Set a link into the PLUGINS section
      pluginsSectionLinks: [
        {
          destination: `/plugins/${pluginId}`, // Endpoint of the link
          icon,
          name,
          label: {
            id: `${pluginId}.plugin.name`, // Refers to a i18n
            defaultMessage: 'MY PLUGIN',
          },
        },
      ],
    },
  },
};
```

## 5. Rebuild the admin panel

Rebuild the admin panel with one of the following commands:

```bash
yarn build --clean
# or
npm run build -- --clean
```

🎉 Congrats, your application has been migrated!
