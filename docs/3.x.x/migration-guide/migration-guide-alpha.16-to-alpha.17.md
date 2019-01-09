# Migration guide from alpha.16 to alpha.17

**Here are the major changes:**

- Add plugin documentation
- Add Cypress to test front-end geting started
- Fix mongoose float/decimal

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.17](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.17)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.16...v3.0.0-alpha.17](https://github.com/strapi/strapi/compare/v3.0.0-alpha.16...v3.0.0-alpha.17)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.17` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.17 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.17` version) of your project.

Run `npm install strapi@3.0.0-alpha.17 --save` to update your strapi version.

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

## ⚠️ Bookshelf custom file (Postgres and MySQL)

If you are using `./config/functions/bookshelf.js` file to custom your bookshelf connection you will have to update your code. We change the second argument of this function.

Please check this [update](https://github.com/strapi/strapi/pull/2370/files#diff-a6643c99335d5a82e1bc4c0a2590e6cb).

<br>

That's all, you have now upgraded to Strapi `alpha.17`.
