'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */

module.exports = {
  models: async ctx => {
    ctx.body = _.mapValues(strapi.models, model =>
      _.pick(model, [
        'info',
        'connection',
        'collectionName',
        'attributes',
        'identity',
        'globalId',
        'globalName',
        'orm',
        'loadedModel',
        'primaryKey',
        'associations'
      ])
    );
  },

  find: async ctx => {
    const { limit, skip = 0, sort, query, queryAttribute } = ctx.request.query;

    // Find entries using `queries` system
    const entries = await strapi.query(ctx.params.model).find({
        limit,
        skip,
        sort,
        query,
        queryAttribute
      });

    ctx.body = entries;
  },

  count: async ctx => {
    // Count using `queries` system
    const count = await strapi.query(ctx.params.model).count();

    ctx.body = {
      count,
    };
  },

  findOne: async ctx => {
    // Find an entry using `queries` system
    const entry = await strapi.query(ctx.params.model).findOne({
      id: ctx.params.id
    });

    // Entry not found
    if (!entry) {
      return (ctx.notFound('Entry not found'));
    }

    ctx.body = entry;
  },

  create: async ctx => {
    // Create an entry using `queries` system
    const entryCreated = await strapi.query(ctx.params.model).create({
      values: ctx.request.body
    });

    ctx.body = entryCreated;
  },

  update: async ctx => {
    const virtualFields = [];
    const params = {
      id: ctx.params.id,
      values: ctx.request.body
    };

    // Retrieve current record.
    const response = await strapi.query(ctx.params.model).findOne(params) || {};
    // Save current model into variable to get virtual and p
    const model = strapi.models[ctx.params.model];


    // Only update fields which are on this document.
    const values = Object.keys(params.values).reduce((acc, current) => {
      if (!model.schema.virtuals.hasOwnProperty(current)) {
        acc[current] = params.values[current];
      } else if (response[current] && _.isArray(response[current]) && current !== 'id'){
        const details = model.attributes[current];

        const toAdd = _.differenceWith(params.values[current], response[current], (a, b) =>
          a[model.primaryKey].toString() === b[model.primaryKey].toString()
        );
        const toRemove = _.differenceWith(response[current], params.values[current], (a, b) =>
          a[model.primaryKey].toString() === b[model.primaryKey].toString()
        )
          .filter(x => toAdd.find(y => x.id === y.id) === undefined);

        toAdd.forEach(value => {
          value[details.via] = params.values[model.primaryKey];

          virtualFields.push(strapi.query(details.model || details.collection).update({
            id: value.id || value[model.primaryKey] || value._id,
            values: value
          }));
        });

        toRemove.forEach(value => {
          value[details.via] = null;

          virtualFields.push(strapi.query(details.model || details.collection).update({
            id: value.id || value[model.primaryKey] || value._id,
            values: value
          }));
        });
      }

      return acc;
    }, {});

    // Add current model to the flow of updates.
    virtualFields.push(strapi.query(ctx.params.model).update({
      id: params.id,
      values
    }));

    // Update virtuals fields.
    const process = await Promise.all(virtualFields);

    // Return the last one which is the current model.
    ctx.body = process[process.length - 1];
  },

  delete: async ctx => {
    // Delete an entry using `queries` system
    const entryDeleted = await strapi.query(ctx.params.model).delete({
      id: ctx.params.id
    });

    ctx.body = entryDeleted;
  },
};
