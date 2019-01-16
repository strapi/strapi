# Migration guide from alpha.12.1 to alpha.12.2

**Here are the major changes:**

- Update relation management
- Fix many bugs and enhancement

**Usefull links:**
- Change log: [https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.12.2](https://github.com/strapi/strapi/releases/tag/v3.0.0-alpha.12.2)
- GitHub diff: [https://github.com/strapi/strapi/compare/v3.0.0-alpha.12.1.3...v3.0.0-alpha.12.2  ](https://github.com/strapi/strapi/compare/v3.0.0-alpha.12.1.3...v3.0.0-alpha.12.2  )

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::


<br>

## Getting started

Install Strapi `alpha.12.2` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.12.2 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Update node modules

Update the Strapi's dependencies version (move Strapi's dependencies to `3.0.0-alpha.12.2` version) of your project.

Run `npm install strapi@3.0.0-alpha.12.2 --save` to update your strapi version and then run the same command for `strapi-mongoose` or `strapi-bookshelf` depending of the module you use in your application.

<br>

## Update the Admin

::: note
If you did custom update of the admin, you will have to manually migrate your update.
:::

Delete your old admin folder and replace it by the new one.

<br>

## Update the Plugins

::: note
If you did custom update on one of the plugin, you will have to manually migrate your update.
:::

Copy the fields and relations you had in your `/plugins/users-permissions/models/User.settings.json` and `/plugins/users-permissions/config/jwt.json` file in the new one.

Then, delete your old `plugins` folder and replace it by the new one.

<br>

## ⚠️ Update API services

You will have to update services of you generated API.

Replace `Article` by your Content Type name in each functions.

For `add` function:

```js
add: async (values) => {
  // Extract values related to relational data.
  const relations = _.pick(values, Article.associations.map(ast => ast.alias));
  const data = _.omit(values, Article.associations.map(ast => ast.alias));

  // Create entry with no-relational data.
  const entry = await Article.create(data);

  // Create relational data and return the entry.
  return Article.updateRelations({ id: entry.id, values: relations });
},
```

For `edit` function:

```js
edit: async (params, values) => {
  // Extract values related to relational data.
  const relations = _.pick(values, Article.associations.map(a => a.alias));
  const data = _.omit(values, Article.associations.map(a => a.alias));

  // Update entry with no-relational data.
  const entry = await Article.update(params, data, { multi: true });

  // Update relational data and return the entry.
  return Article.updateRelations(Object.assign(params, { values: relations }));
},
```

For `remove` function:

```js
remove: async params => {
  // Select field to populate.
  const populate = Article.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias)
    .join(' ');

  // Note: To get the full response of Mongo, use the `remove()` method
  // or add spent the parameter `{ passRawResult: true }` as second argument.
  const data = await Article
    .findOneAndRemove(params, {})
    .populate(populate);

  if (!data) {
    return data;
  }

  await Promise.all(
    Article.associations.map(async association => {
      const search = _.endsWith(association.nature, 'One') || association.nature === 'oneToMany' ? { [association.via]: data._id } : { [association.via]: { $in: [data._id] } };
      const update = _.endsWith(association.nature, 'One') || association.nature === 'oneToMany' ? { [association.via]: null } : { $pull: { [association.via]: data._id } };

      // Retrieve model.
      const model = association.plugin ?
        strapi.plugins[association.plugin].models[association.model || association.collection] :
        strapi.models[association.model || association.collection];

      return model.update(search, update, { multi: true });
    })
  );

  return data;
}
```

That's all, you have now upgraded to Strapi `alpha.12.2`.
