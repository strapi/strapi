'use strict';

const { propOr } = require('lodash/fp');

const {
  hasDraftAndPublish,
  constants: { PUBLISHED_AT_ATTRIBUTE },
} = require('@strapi/utils').contentTypes;

const {
  getPaginationInfo,
  convertPagedToStartLimit,
  shouldCount,
  transformPaginationResponse,
} = require('./pagination');

const setPublishedAt = data => {
  data[PUBLISHED_AT_ATTRIBUTE] = propOr(new Date(), PUBLISHED_AT_ATTRIBUTE, data);
};

/**
 *
 * Returns a collection type service to handle default core-api actions
 */
const createCollectionTypeService = ({ model, strapi, utils }) => {
  const { uid } = model;

  const { sanitizeInput, getFetchParams } = utils;

  return {
    async find(params = {}) {
      const fetchParams = getFetchParams(params);

      const paginationInfo = getPaginationInfo(fetchParams);

      const results = await strapi.entityService.findMany(uid, {
        ...fetchParams,
        ...convertPagedToStartLimit(paginationInfo),
      });

      if (shouldCount(fetchParams)) {
        const count = await strapi.entityService.count(uid, { ...fetchParams, ...paginationInfo });

        return {
          results,
          pagination: transformPaginationResponse(paginationInfo, count),
        };
      }

      return {
        results,
        pagination: paginationInfo,
      };
    },

    findOne(entityId, params = {}) {
      return strapi.entityService.findOne(uid, entityId, getFetchParams(params));
    },

    create(params = {}) {
      const { data } = params;
      const sanitizedData = sanitizeInput(data);

      if (hasDraftAndPublish(model)) {
        setPublishedAt(sanitizedData);
      }

      return strapi.entityService.create(uid, { ...params, data: sanitizedData });
    },

    update(entityId, params = {}) {
      const { data } = params;
      const sanitizedData = sanitizeInput(data);

      return strapi.entityService.update(uid, entityId, { ...params, data: sanitizedData });
    },

    delete(entityId, params = {}) {
      return strapi.entityService.delete(uid, entityId, params);
    },
  };
};

module.exports = createCollectionTypeService;
