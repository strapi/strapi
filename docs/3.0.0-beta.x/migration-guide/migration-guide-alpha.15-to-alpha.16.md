# Migration guide from alpha.15 to alpha.16

**Here are the major changes:**

- Fix Relations on filter

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.16](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.16)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.15...v3.0.0-alpha.16](https://github.com/strapi/strapi/compare/v3.0.0-alpha.15...v3.0.0-alpha.16)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.16` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.16 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.16` version) of your project.

Run `npm install strapi@3.0.0-alpha.16 --save` to update your strapi version.

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

## ⚠️ Bookshelf (Postgres and MySQL)

Reverse of migration [alpha.14.5 to alpha.15](migration-guide-alpha.14.5-to-alpha.15) Bookshelf section.

Go in [diff files](https://github.com/strapi/strapi/compare/v3.0.0-alpha.15...v3.0.0-alpha.16) and search for following files:

Services: `packages/strapi-generate-api/templates/bookshelf/service.template`
Life cycle: `packages/strapi-generate-model/templates/bookshelf/model.template`

You will have to update all your service by applying the diff.

<br>

## ⚠️ Mongoose (Mongo)

Reverse of migration [alpha.14.5 to alpha.15](migration-guide-alpha.14.5-to-alpha.15) Mongoose section.

Go in [diff files](https://github.com/strapi/strapi/compare/v3.0.0-alpha.15...v3.0.0-alpha.16) and search for following files:

Service: `packages/strapi-generate-api/templates/mongoose/service.template`

You will have to update all your service by applying the diff.

<br>

That's all, you have now upgraded to Strapi `alpha.16`.
