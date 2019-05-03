# Migration guide from alpha.25 to alpha.26.2

**Here are the major changes:**

- Fix some issues

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.26](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.26)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.25...v3.0.0-alpha.26.2](https://github.com/strapi/strapi/compare/v3.0.0-alpha.25...v3.0.0-alpha.26.2)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.26.2` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.26.2 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.26.2` version) of your project.

Run `npm install strapi@3.0.0-alpha.26.2 --save` to update your strapi version.

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


## Add deep filtering feature

By default your generated API will not have the deep filtering feature provide by this release. You will have to make some updates.

### Updating Mongoose

**Updating your controllers**:  [https://github.com/strapi/strapi/pull/2961/files#diff-008d6bf29828238415549d6caf613284](https://github.com/strapi/strapi/pull/2961/files#diff-008d6bf29828238415549d6caf613284)

You will have to add `, next, { populate } = {}` in the arguments of the `find` function.

Before

```js
find: async (ctx) => {
  // ...
},
```

After

```js
find: async (ctx, next, { populate } = {}) => {
  // ...
},
```

**Updating your services**: [https://github.com/strapi/strapi/pull/2961/files#diff-c36b911d1bc2922e1d7cf93ae692e054](https://github.com/strapi/strapi/pull/2961/files#diff-c36b911d1bc2922e1d7cf93ae692e054)

You will have to add this requirement on the top of you file `const { convertRestQueryParams, buildQuery } = require('strapi-utils');`

Replace the `fetchAll` function by the following code.

```js
fetchAll: (params, populate) => {
  const filters = convertRestQueryParams(params);

  const populateOpt = populate || <%= globalID %>.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias);

  return buildQuery({
    model: <%= globalID %>,
    filters,
    populate: populateOpt,
  });
},
```

Replace the `count` function by the following code.

```js
count: (params) => {
  const filters = convertRestQueryParams(params);

  return buildQuery({
    model: <%= globalID %>,
    filters: { where: filters.where },
  })
    .count();
```

And replace `<%= globalID %>` by the Global of your API.

## Updating Bookshelf

**Updating your controllers**: [https://github.com/strapi/strapi/pull/2961/files#diff-a2a09f28ea5f2a78c485c232dd2dbfde](https://github.com/strapi/strapi/pull/2961/files#diff-a2a09f28ea5f2a78c485c232dd2dbfde)

You will have to add `, next, { populate } = {}` in the arguments of the `find` function.

Before

```js
find: async (ctx) => {
  // ...
},
```

After

```js
find: async (ctx, next, { populate } = {}) => {
  // ...
},
```

Send this new argument in the service function.

Before `return strapi.services.<%= id %>.fetchAll(ctx.query);`
After: `return strapi.services.<%= id %>.fetchAll(ctx.query, populate);`

It will be the same update for the `count` function.

**Updating your services**: [https://github.com/strapi/strapi/pull/2961/files#diff-61ba361ed6161efcd5f4e583001cc9c9](https://github.com/strapi/strapi/pull/2961/files#diff-61ba361ed6161efcd5f4e583001cc9c9)

You will have to add this requirement on the top of you file `const { convertRestQueryParams, buildQuery } = require('strapi-utils');`

Replace the `fetchAll` function by the following code.

```js
fetchAll: (params, populate) => {
  // Select field to populate.
  const withRelated = populate || <%= globalID %>.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias);

  const filters = convertRestQueryParams(params);

  return <%= globalID %>.query(buildQuery({ model: <%= globalID %>, filters }))
    .fetchAll({ withRelated })
    .then(data => data.toJSON());
},
```

Replace the `count` function by the following code.

```js
count: (params) => {
  // Convert `params` object to filters compatible with Bookshelf.
  const filters = convertRestQueryParams(params);

  return <%= globalID %>.query(buildQuery({ model: <%= globalID %>, filters: _.pick(filters, 'where') })).count();
},
```

And replace `<%= globalID %>` by the Global of your API.

<br>

That's all, you have now upgraded to Strapi `alpha.26.2`.
