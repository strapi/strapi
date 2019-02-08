# Migration guide from alpha.19 to alpha.20

**Here are the major changes:**

- Fix email issue on user update
- Improve GraphQL performances

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.20](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.20)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.19...v3.0.0-alpha.20](https://github.com/strapi/strapi/compare/v3.0.0-alpha.19...v3.0.0-alpha.20)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.20` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.20 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.20` version) of your project.

Run `npm install strapi@3.0.0-alpha.20 --save` to update your strapi version.

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

## Update services

For both bookshelf and mongoose, you will have to update all services of your generated API.

You will have to update one line of the `fetchAll` function.

**Mongoose** replace `.populate(populate);` by `.populate(filters.populate || populate);`.
**Bookshelf**: replace `withRelated: populate` by `withRelated: filters.populate || populate`.

<br>

That's all, you have now upgraded to Strapi `alpha.20`.
