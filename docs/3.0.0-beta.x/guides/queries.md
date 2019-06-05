# Queries

Strapi provides a utility function `strapi.query` to make database queries ORM agnostic.

## Core Queries

In Strapi's [core services](./services.md#core-services) you can see we call a `strapi.query` function.

When customizing your model services you might want to implement some custom database queries.
To help you with that here is the current implementation of the queries for both `bookshelf` and `mongoose`.

You can simply copy and paste the code in your custom services.

### Bookshelf

```js
const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ model }) => {
  return {
    find(params, populate) {
      const withRelated =
        populate ||
        model.associations
          .filter(ast => ast.autoPopulate !== false)
          .map(ast => ast.alias);

      const filters = convertRestQueryParams(params);

      return model
        .query(buildQuery({ model, filters }))
        .fetchAll({ withRelated });
    },

    findOne(params, populate) {
      const withRelated =
        populate ||
        model.associations
          .filter(ast => ast.autoPopulate !== false)
          .map(ast => ast.alias);

      return model
        .forge({
          [model.primaryKey]: params[model.primaryKey] || params.id,
        })
        .fetch({
          withRelated,
        });
    },

    count(params = {}) {
      const { where } = convertRestQueryParams(params);

      return model.query(buildQuery({ model, filters: { where } })).count();
    },

    async create(values) {
      const relations = _.pick(
        values,
        model.associations.map(ast => ast.alias)
      );
      const data = _.omit(values, model.associations.map(ast => ast.alias));

      // Create entry with no-relational data.
      const entry = await model.forge(data).save();

      // Create relational data and return the entry.
      return model.updateRelations({ id: entry.id, values: relations });
    },

    async update(params, values) {
      // Extract values related to relational data.
      const relations = _.pick(
        values,
        model.associations.map(ast => ast.alias)
      );
      const data = _.omit(values, model.associations.map(ast => ast.alias));

      // Create entry with no-relational data.
      await model.forge(params).save(data);

      // Create relational data and return the entry.
      return model.updateRelations(
        Object.assign(params, { values: relations })
      );
    },

    async delete(params) {
      params.values = {};
      model.associations.map(association => {
        switch (association.nature) {
          case 'oneWay':
          case 'oneToOne':
          case 'manyToOne':
          case 'oneToManyMorph':
            params.values[association.alias] = null;
            break;
          case 'oneToMany':
          case 'manyToMany':
          case 'manyToManyMorph':
            params.values[association.alias] = [];
            break;
          default:
        }
      });

      await model.updateRelations(params);
      return model.forge(params).destroy();
    },

    search(params, populate) {
      // Convert `params` object to filters compatible with Bookshelf.
      const filters = strapi.utils.models.convertParams(model.globalId, params);

      // Select field to populate.
      const withRelated =
        populate ||
        model.associations
          .filter(ast => ast.autoPopulate !== false)
          .map(ast => ast.alias);

      return model
        .query(qb => {
          buildSearchQuery(qb, model, params);

          if (filters.sort) {
            qb.orderBy(filters.sort.key, filters.sort.order);
          }

          if (filters.start) {
            qb.offset(_.toNumber(filters.start));
          }

          if (filters.limit) {
            qb.limit(_.toNumber(filters.limit));
          }
        })
        .fetchAll({
          withRelated,
        });
    },

    countSearch(params) {
      return model.query(qb => buildSearchQuery(qb, model, params)).count();
    },
  };
};

/**
 * util to build search query
 * @param {*} qb
 * @param {*} model
 * @param {*} params
 */
const buildSearchQuery = (qb, model, params) => {
  const query = (params._q || '').replace(/[^a-zA-Z0-9.-\s]+/g, '');

  const associations = model.associations.map(x => x.alias);

  const searchText = Object.keys(model._attributes)
    .filter(
      attribute =>
        attribute !== model.primaryKey && !associations.includes(attribute)
    )
    .filter(attribute =>
      ['string', 'text'].includes(model._attributes[attribute].type)
    );

  const searchInt = Object.keys(model._attributes)
    .filter(
      attribute =>
        attribute !== model.primaryKey && !associations.includes(attribute)
    )
    .filter(attribute =>
      ['integer', 'decimal', 'float'].includes(
        model._attributes[attribute].type
      )
    );

  const searchBool = Object.keys(model._attributes)
    .filter(
      attribute =>
        attribute !== model.primaryKey && !associations.includes(attribute)
    )
    .filter(attribute =>
      ['boolean'].includes(model._attributes[attribute].type)
    );

  if (!_.isNaN(_.toNumber(query))) {
    searchInt.forEach(attribute => {
      qb.orWhereRaw(`${attribute} = ${_.toNumber(query)}`);
    });
  }

  if (query === 'true' || query === 'false') {
    searchBool.forEach(attribute => {
      qb.orWhereRaw(`${attribute} = ${_.toNumber(query === 'true')}`);
    });
  }

  // Search in columns with text using index.
  switch (model.client) {
    case 'mysql':
      qb.orWhereRaw(
        `MATCH(${searchText.join(',')}) AGAINST(? IN BOOLEAN MODE)`,
        `*${query}*`
      );
      break;
    case 'pg': {
      const searchQuery = searchText.map(attribute =>
        _.toLower(attribute) === attribute
          ? `to_tsvector(${attribute})`
          : `to_tsvector('${attribute}')`
      );

      qb.orWhereRaw(`${searchQuery.join(' || ')} @@ to_tsquery(?)`, query);
      break;
    }
  }
};
```

### Mongoose

```js
const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ model, strapi }) => {
  const assocs = model.associations.map(ast => ast.alias);

  const defaultPopulate = model.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias);

  return {
    find(params, populate) {
      const populateOpt = populate || defaultPopulate;

      const filters = convertRestQueryParams(params);

      return buildQuery({
        model,
        filters,
        populate: populateOpt,
      });
    },

    findOne(params, populate) {
      const populateOpt = populate || defaultPopulate;

      return model
        .findOne({
          [model.primaryKey]: params[model.primaryKey] || params.id,
        })
        .populate(populateOpt);
    },

    count(params) {
      const filters = convertRestQueryParams(params);

      return buildQuery({
        model,
        filters: { where: filters.where },
      }).count();
    },

    async create(values) {
      // Extract values related to relational data.
      const relations = _.pick(values, assocs);
      const data = _.omit(values, assocs);

      // Create entry with no-relational data.
      const entry = await model.create(data);

      // Create relational data and return the entry.
      return model.updateRelations({ _id: entry.id, values: relations });
    },

    async update(params, values) {
      // Extract values related to relational data.
      const relations = _.pick(values, assocs);
      const data = _.omit(values, assocs);

      // Update entry with no-relational data.
      await model.updateOne(params, data, { multi: true });

      // Update relational data and return the entry.
      return model.updateRelations(
        Object.assign(params, { values: relations })
      );
    },

    async delete(params) {
      const data = await model
        .findOneAndRemove(params, {})
        .populate(defaultPopulate);

      if (!data) {
        return data;
      }

      await Promise.all(
        model.associations.map(async association => {
          if (!association.via || !data._id || association.dominant) {
            return true;
          }

          const search =
            _.endsWith(association.nature, 'One') ||
            association.nature === 'oneToMany'
              ? { [association.via]: data._id }
              : { [association.via]: { $in: [data._id] } };
          const update =
            _.endsWith(association.nature, 'One') ||
            association.nature === 'oneToMany'
              ? { [association.via]: null }
              : { $pull: { [association.via]: data._id } };

          // Retrieve model.
          const model = association.plugin
            ? strapi.plugins[association.plugin].models[
                association.model || association.collection
              ]
            : strapi.models[association.model || association.collection];

          return model.update(search, update, { multi: true });
        })
      );

      return data;
    },

    search(params, populate) {
      // Convert `params` object to filters compatible with Mongo.
      const filters = strapi.utils.models.convertParams(model.globalId, params);

      const $or = buildSearchOr(model, params._q);

      return model
        .find({ $or })
        .sort(filters.sort)
        .skip(filters.start)
        .limit(filters.limit)
        .populate(populate || defaultPopulate);
    },

    countSearch(params) {
      const $or = buildSearchOr(model, params._q);
      return model.find({ $or }).countDocuments();
    },
  };
};

const buildSearchOr = (model, query) => {
  return Object.keys(model.attributes).reduce((acc, curr) => {
    switch (model.attributes[curr].type) {
      case 'integer':
      case 'float':
      case 'decimal':
        if (!_.isNaN(_.toNumber(query))) {
          return acc.concat({ [curr]: query });
        }

        return acc;
      case 'string':
      case 'text':
      case 'password':
        return acc.concat({ [curr]: { $regex: query, $options: 'i' } });
      case 'boolean':
        if (query === 'true' || query === 'false') {
          return acc.concat({ [curr]: query === 'true' });
        }

        return acc;
      default:
        return acc;
    }
  }, []);
};
```

## Understanding queries

`strapi.query` will generate a queries object by passing a model to the factory function matching the model's ORM.

In this example the User model from the Users and Permissions plugin is used.
By default the model is passed to `strapi/lib/core-api/queries/bookshelf.js` or `strapi/lib/core-api/queries/mongoose.js` depending on your connection configuration.

```js
const queries = strapi.query('users', 'users-permissions');

// makes the bookshelf or mongoose queries available with a specific model binded to them
queries.find();
```

### Usage in plugins

To make plugins ORM agnostic, we create a queries function for every plugin that will either load the queries from the plugin's `config/queries` folder if it exists or use the default queries from the `core-api/queries` folder.

```js
// this will call the queries defined in the users-permissions plugin
// with the model user from the users-permissions plugin
strapi.plugins['users-permissions'].queries('user', 'users-permissions').find();
```
