# Migration guide from alpha.14.3 to alpha.14.4

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.14.4.0](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.14.4.0)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.3...v3.0.0-alpha.14.4.0](https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.3...v3.0.0-alpha.14.4.0)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.14.4.0` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.14.4.0 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.14.4.0` version) of your project.

Run `npm install strapi@3.0.0-alpha.14.4.0 --save` to update your strapi version.

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

## Update Bookshelf services

We update generated API with bookshelf.

In `fetchAll` function replace `if (_.isArray(where.value)) {` with `if (_.isArray(where.value) && where.symbol !== 'IN') {`

::: note
From this change [https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.3...v3.0.0-alpha.14.4.0#diff-61ba361ed6161efcd5f4e583001cc9c9](https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.3...v3.0.0-alpha.14.4.0#diff-61ba361ed6161efcd5f4e583001cc9c9)
:::

## Update Mongoose services

We update generated API with mongoose.

In `remove` function add the following condition:

```js
await Promise.all(
  <%= globalID %>.associations.map(async association => {
    if (!association.via || !data._id) {
      return true;
    }
```

::: note
From this change [https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.3...v3.0.0-alpha.14.4.0#diff-c36b911d1bc2922e1d7cf93ae692e054](https://github.com/strapi/strapi/compare/v3.0.0-alpha.14.3...v3.0.0-alpha.14.4.0#diff-c36b911d1bc2922e1d7cf93ae692e054)
:::

<br>

That's all, you have now upgraded to Strapi `alpha.14.4.0`.
