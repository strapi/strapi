# Migration guide from alpha.12.2 to alpha.12.3

**Here are the major changes:**

- Framework tests suite
- Filters in the Content Manager plugin
- One way relation in the Content-Type Builder
- GraphQL update: timestamp fields update and some bug fixes
- Fix delete manyToMany relations with Mongoose

**Useful links:**
- Changelog: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.12.3](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.12.3)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.12.2...v3.0.0-alpha.12.3](https://github.com/strapi/strapi/compare/v3.0.0-alpha.12.2...v3.0.0-alpha.12.3)

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::

<br>

## Getting started

Install Strapi `alpha.12.3` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.12.3 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.12.3` version) of your project.

Run `npm install strapi@3.0.0-alpha.12.3 --save` to update your strapi version and then run the same command for `strapi-mongoose` or `strapi-bookshelf` depending on the module you use in your application.

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

## ⚠️ Warning for SQL users

Please check your `decimal` data type. If in the past you received `string` instead of `number` the issue has been fixed.

Same thing for `boolean` type, if in the past you received `1` and `0` instead of `true` and `false`. We fixed it.

<br>

## ⚠️ Warning for GraphQL users

GraphQL timestamp attribute change. If you are using `mongoose` nothing will change for you.

If you are using `bookshelf` you will have to change `created_at` and `updated_at` by `createdAt` and `updatedAt`

<br>

## Add count route

You need to add a new route in your API.

Update the `./api/:name/config/route.json` file to add the new route. ⚠️ put it BEFORE the findOne route.

```json
{
  "method": "GET",
  "path": "/article/count",
  "handler": "Article.count",
  "config": {
    "policies": []
  }
}
```

Then update your controller's file and add the count action.

```js
/**
  * Count article records.
  *
  * @return {Number}
  */

count: async (ctx) => {
  return strapi.services.article.count(ctx.query);
}
```

For Mongo applications update the service of your API with the following code:

```js
/**
  * Promise to count articles.
  *
  * @return {Promise}
  */

count: (params) => {
  // Convert `params` object to filters compatible with Mongo.
  const filters = strapi.utils.models.convertParams('article', params);

  return Article
    .count()
    .where(filters.where);
}
```

And for Postgres and MySQL applications with this one:

```js
/**
  * Promise to count a/an article.
  *
  * @return {Promise}
  */

count: (params) => {
  // Convert `params` object to filters compatible with Bookshelf.
  const filters = strapi.utils.models.convertParams('article', params);

  return Article.query(function(qb) {
    _.forEach(filters.where, (where, key) => {
      if (_.isArray(where.value)) {
        for (const value in where.value) {
          qb[value ? 'where' : 'orWhere'](key, where.symbol, where.value[value])
        }
      } else {
        qb.where(key, where.symbol, where.value);
      }
    });
  }).count();
}
```

That's all, you have now upgraded to Strapi `alpha.12.3`.
