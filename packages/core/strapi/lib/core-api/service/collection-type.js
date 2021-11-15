'use strict';

const { propOr, isObject } = require('lodash/fp');

const {
  hasDraftAndPublish,
  constants: { PUBLISHED_AT_ATTRIBUTE },
} = require('@strapi/utils').contentTypes;
const { ValidationError } = require('@strapi/utils').errors;

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

  const { getFetchParams } = utils;

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

      if (!isObject(data)) {
        throw new ValidationError(`Expecting body.data to be an object but found '${typeof data}'`);
      }

      if (hasDraftAndPublish(model)) {
        setPublishedAt(data);
      }

      return strapi.entityService.create(uid, { ...params, data });
    },

    update(entityId, params = {}) {
      const { data } = params;

      return strapi.entityService.update(uid, entityId, { ...params, data });
    },

    delete(entityId, params = {}) {
      return strapi.entityService.delete(uid, entityId, params);
    },
  };
};

module.exports = createCollectionTypeService;
