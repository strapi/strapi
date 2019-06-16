# Migration guide from alpha.13.1 to alpha.14

**Here are the major changes:**

- New configuration of the content manager
- GraphQL Aggregation Feature
- Email confirmation and block user feature


**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.14](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.14)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.13.1...v3.0.0-alpha.14](https://github.com/strapi/strapi/compare/v3.0.0-alpha.13.1...v3.0.0-alpha.14)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.14` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.14 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.14` version) of your project.

Run `npm install strapi@3.0.0-alpha.14 --save` to update your strapi version.

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

## Reset your content manager settings

We added a new section in the content manager configurations. You are now able to customize the inputs displayed in the contribution view.

The stored data format has been changed. That is why you **will have** to **delete** in the `core_store` collection/table the entry with the `key` `plugin_content-manager_schema`.

Then take a ☕️ and take few minutes to reconfigure your stuffs.

Hope you will enjoy this new feature.

<br>

## Heroku setups
It's necessary to add `DATABASE_NAME` into your environment variable otherwise your app doesn't start.

<br>

That's all, you have now upgraded to Strapi `alpha.14`.
