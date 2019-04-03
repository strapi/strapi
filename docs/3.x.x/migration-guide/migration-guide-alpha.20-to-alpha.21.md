# Migration guide from alpha.20 to alpha.21

**Here are the major changes:**

- Fix timestamps issue about update data in MySQL
- Fix production start

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.21](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.21)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.20...v3.0.0-alpha.21](https://github.com/strapi/strapi/compare/v3.0.0-alpha.20...v3.0.0-alpha.21)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.21` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.21 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.21` version) of your project.

Run `npm install strapi@3.0.0-alpha.21 --save` to update your strapi version.

<br>

## Update the Admin

::: note
If you performed updates in the Admin, you will have to manually migrate your changes.
:::

Delete your old admin folder and replace it with the new one.

<br>

## Update the Plugins

::: note
If you did a custom update on one of the plugins, you will have to manually migrate your update.
:::

Copy the fields and relations you had in your `/plugins/users-permissions/models/User.settings.json` and `/plugins/users-permissions/config/jwt.json` file in the new one.

Then, delete your old `plugins` folder and replace it with the new one.

<br>

That's all, you have now upgraded to Strapi `alpha.21`.
