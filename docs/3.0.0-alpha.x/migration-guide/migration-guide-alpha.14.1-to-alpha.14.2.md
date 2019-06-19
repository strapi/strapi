# Migration guide from alpha.14.1 to alpha.14.2

**Here are the major changes:**

- Generated API routes are now pluralized 💥
- Fix send email method


**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.14.2](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.14.2)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.1...v3.0.0-alpha.14.2](https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.1...v3.0.0-alpha.14.2)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.14.2` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.14.2 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.14.2` version) of your project.

Run `npm install strapi@3.0.0-alpha.14.2 --save` to update your strapi version.

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

## ⚠️ Users API routes pluralized 💥

Since the routes are now pluralized ([issue](https://github.com/strapi/strapi/issues/504) - [pr](https://github.com/strapi/strapi/pull/1725)) you might need to update them in your client app.
Routes list [here](https://github.com/strapi/strapi/pull/1725/files#diff-8836e4ea317896c004860b47776c800f)

<br>

That's all, you have now upgraded to Strapi `alpha.14.2`.
