# Migration guide from alpha.14.5 to alpha.15

**Here are the major changes:**

- Relations on filter
- Update provider prefix
- Fix proxy for authentication providers

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.15](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.15)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.5...v3.0.0-alpha.15](https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.5...v3.0.0-alpha.15)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.15` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.15 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.15` version) of your project.

Run `npm install strapi@3.0.0-alpha.15 --save` to update your strapi version.

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

Go in [diff files](https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.5...v3.0.0-alpha.15) and search for following files:

Services: `packages/strapi-generate-api/templates/bookshelf/service.template`

Life cycle: `packages/strapi-generate-model/templates/bookshelf/model.template`

You will have to update all your service by applying the diff.

<br>

## ⚠️ Mongoose (Mongo)

Go in [diff files](https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.5...v3.0.0-alpha.15) and search for following files:

Service: `packages/strapi-generate-api/templates/mongoose/service.template`

You will have to update all your service by applying the diff.

<br>

## Providers

Like hook, middleware and plugin - we prefix plugin provider with provider
Format: strapi-provider-[plugin_name]-[provider]

eg. `strapi-email-sendmail` become `strapi-provider-email-sendmail`

We still support the old format for next version to let time to providers maintainers to make migration.

<br>

That's all, you have now upgraded to Strapi `alpha.15`.
