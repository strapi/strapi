# Migration guide from alpha.8 to alpha.9

**Here are the major changes:**

- Put roles' permissions in database
- Providers connection (Facebook, GitHub, ...)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.9` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.9 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Configurations

You will have to update just 2 files: `package.json` and `request.json`

- Edit the Strapi's dependencies version: (move Strapi's dependencies to `3.0.0-alpha.9` version) in `package.json` file

```json
{
  "dependencies": {
    "lodash": "4.x.x",
    "strapi": "3.0.0-alpha.9",
    "strapi-mongoose": "3.0.0-alpha.9"
  }
}
```


- Edit the `session.enabled` settings to `true` in each environment file: `/configs/environments/***/request.json`

```json
{
  "session": {
    "enabled": true
  }
}
```

<br>

## Update the Admin

Delete your old admin folder and replace it by the new one.

<br>

## Update the Plugins

Copy this file `/plugins/users-permissions/config/jwt.json` **from your old project** and paste it in the corresponding one in your new project.

Copy the fields and relations you had in your `/plugins/users-permissions/models/User.settings.json` and `/plugins/users-permissions/config/jwt.json` file in the new one.

Then, delete your old `plugins` folder and replace it by the new one.

<br>

## ⚠️  Roles update

Roles are now stored in your database. You will have to re-create and configure them via the admin dashboard.

<br>

## ⚠️  User collection/table name has changed

If you have an existing set of users in your database you will have to rename the collection/table from `user` to `users-permissions_user`.

Then update all your users by changing the old role id by the new one which is in `users-permissions_role` collection/table.


That's all, you have now upgraded to Strapi `alpha.9`.
