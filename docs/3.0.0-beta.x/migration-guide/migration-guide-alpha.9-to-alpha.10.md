# Migration guide from alpha.9 to alpha.10

**Here are the major changes:**

- Add database store config
- New lib input

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.10.1` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.10.1 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Configurations

You will have to update just 1 file: `package.json`

- Edit the Strapi's dependencies version: (move Strapi's dependencies to `3.0.0-alpha.10.1` version) in `package.json` file

```json
{
  "dependencies": {
    "lodash": "4.x.x",
    "strapi": "3.0.0-alpha.10.1",
    "strapi-mongoose": "3.0.0-alpha.10.1"
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

## ⚠️  Config in database

To let you update your configurations when your application is deployed on multiple server instances, we have created a data store for settings. So we moved all the `users-permissions` plugin's configs in database.

You will have to reconfigure all your `users-permissions` configs from the admin panel. Then delete the `advanced.json`, `email.json` and `grant.json` files from `plugins/users-permissions/config` folder.

<br>

## ⚠️  Data type Number

We fixed how mongoose handles the model's `Number` type. Previously, mongoose stored `Number` type as `String` and now it's `Integer`. So you will have to update all your documents which have a type `Number` in its model and replace their `String` value with a `Number` one.


That's all, you have now upgraded to Strapi `alpha.10`.
