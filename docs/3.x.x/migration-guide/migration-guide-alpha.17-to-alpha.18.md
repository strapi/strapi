# Migration guide from alpha.17 to alpha.18

**Here are the major changes:**

- Improve debug on strapi new
- Apollo server tracing in GraphQL
- Fix cors

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.18](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.18)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.17...v3.0.0-alpha.18](https://github.com/strapi/strapi/compare/v3.0.0-alpha.17...v3.0.0-alpha.18)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.18` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.18 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.18` version) of your project.

Run `npm install strapi@3.0.0-alpha.18 --save` to update your strapi version.

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

That's all, you have now upgraded to Strapi `alpha.18`.
