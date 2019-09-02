# Migration guide from alpha.24 to alpha.25.2

**Here are the major changes:**

- Getting started videos helper in the admin
- New getting started

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.25.2](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.25)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.24...v3.0.0-alpha.25.2](https://github.com/strapi/strapi/compare/v3.0.0-alpha.24...v3.0.0-alpha.25.2)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.25.2` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.25.2 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.25.2` version) of your project.

Run `npm install strapi@3.0.0-alpha.25.2 --save` to update your strapi version.

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

## Update Mongoose

Update all your API services by following this update [https://github.com/strapi/strapi/pull/2812/files#diff-c36b911d1bc2922e1d7cf93ae692e054R132](https://github.com/strapi/strapi/pull/2812/files#diff-c36b911d1bc2922e1d7cf93ae692e054R132)

## Update Bookshelf

Update all your API services by following this update [https://github.com/strapi/strapi/pull/2970/files#diff-61ba361ed6161efcd5f4e583001cc9c9R240](https://github.com/strapi/strapi/pull/2970/files#diff-61ba361ed6161efcd5f4e583001cc9c9R240) and  [https://github.com/strapi/strapi/pull/2864/files#diff-61ba361ed6161efcd5f4e583001cc9c9R124](https://github.com/strapi/strapi/pull/2864/files#diff-61ba361ed6161efcd5f4e583001cc9c9R124)

We update the name of the life cycle for the before/after fetch all [https://github.com/strapi/strapi/pull/2965/files](https://github.com/strapi/strapi/pull/2965/files)
You will have to replace `beforeFetchCollection` by `beforeFetchAll` if you added theses functions in you `Model.js` files.

<br>

That's all, you have now upgraded to Strapi `alpha.25.2`.
