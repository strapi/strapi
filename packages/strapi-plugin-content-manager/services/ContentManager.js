'use strict';

const _ = require('lodash');
const {
  contentTypes: contentTypesUtils,
  sanitizeEntity,
  webhook: webhookUtils,
} = require('strapi-utils');

const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;
const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = webhookUtils.webhookEvents;
/**
 * A set of functions called "actions" for `ContentManager`
 */
module.exports = {
  fetchAll(model, query) {
    const { query: request, populate, ...filters } = query;

    const queryFilter = !_.isEmpty(request)
      ? {
          ...filters, // Filters is an object containing the limit/sort and start
          ...request,
        }
      : filters;

    return strapi.entityService.find(
      {
        params: queryFilter,
        populate,
      },
      { model }
    );
  },

  fetch(model, id, config = {}) {
    const { query = {}, populate } = config;

    return strapi.entityService.findOne(
      {
        params: { ...query, id },
        populate,
      },
      { model }
    );
  },

  count(model, query) {
    return strapi.entityService.count({ params: query }, { model });
  },

  create({ data, files }, { model } = {}) {
    const modelDef = strapi.getModel(model);
    const publishData = { ...data };
    if (contentTypesUtils.hasDraftAndPublish(modelDef)) {
      publishData[PUBLISHED_AT_ATTRIBUTE] = null;
    }

    return strapi.entityService.create({ data: publishData, files }, { model });
  },

  edit(params, { data, files }, { model } = {}) {
    const publishData = _.omit(data, PUBLISHED_AT_ATTRIBUTE);
    return strapi.entityService.update({ params, data: publishData, files }, { model });
  },

  delete(model, query) {
    return strapi.entityService.delete({ params: query }, { model });
  },

  deleteMany(model, ids, query) {
    const { primaryKey } = strapi.query(model);

    return strapi.entityService.delete(
      {
        params: {
          _limit: 100,
          ...query,
          _where: _.concat({ [`${primaryKey}_in`]: ids }, query._where || {}),
        },
      },
      { model }
    );
  },

  search(model, query, params) {
    return strapi.entityService.search({ params: { ...query, ...params } }, { model });
  },

  countSearch(model, query) {
    return strapi.entityService.countSearch({ params: query }, { model });
  },

  async publish(params, model) {
    const modelDef = strapi.getModel(model);

    const publishedEntry = await strapi.entityService.update(
      { params, data: { [PUBLISHED_AT_ATTRIBUTE]: new Date() } },
      { model }
    );

    strapi.eventHub.emit(ENTRY_PUBLISH, {
      model: modelDef.modelName,
      entry: sanitizeEntity(publishedEntry, { model: modelDef }),
    });

    return publishedEntry;
  },

  async unpublish(params, model) {
    const modelDef = strapi.getModel(model);

    const unpublishedEntry = await strapi.entityService.update(
      { params, data: { [PUBLISHED_AT_ATTRIBUTE]: null } },
      { model }
    );
    strapi.eventHub.emit(ENTRY_UNPUBLISH, {
      model: modelDef.modelName,
      entry: sanitizeEntity(unpublishedEntry, { model: modelDef }),
    });

    return unpublishedEntry;
  },
};
