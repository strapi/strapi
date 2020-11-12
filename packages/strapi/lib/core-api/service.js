'use strict';

const _ = require('lodash');
const utils = require('strapi-utils');
const {
  contentTypes: {
    hasDraftAndPublish,
    constants: { PUBLISHED_AT_ATTRIBUTE, DP_PUB_STATE_LIVE },
  },
} = require('strapi-utils');

const getFetchParams = params => {
  const defaultParams = {};

  Object.assign(defaultParams, {
    _publicationState: DP_PUB_STATE_LIVE,
  });

  return { ...defaultParams, ...params };
};

/**
 * default service
 *
 */
const createCoreService = ({ model, strapi }) => {
  const serviceFactory =
    model.kind === 'singleType' ? createSingleTypeService : createCollectionTypeService;

  return serviceFactory({ model, strapi });
};

/**
 * Mixins
 */
const createUtils = ({ model }) => {
  const { getNonWritableAttributes } = utils.contentTypes;

  return {
    sanitizeInput: data => _.omit(data, getNonWritableAttributes(model)),
  };
};

/**
 * Returns a single type service to handle default core-api actions
 */
const createSingleTypeService = ({ model, strapi }) => {
  const { modelName } = model;
  const { sanitizeInput } = createUtils({ model });

  return {
    /**
     * Returns single type content
     *
     * @return {Promise}
     */
    find(params, populate) {
      return strapi.entityService.find(
        { params: getFetchParams(params), populate },
        { model: modelName }
      );
    },

    /**
     * Creates or update the single- type content
     *
     * @return {Promise}
     */
    async createOrUpdate(data, { files } = {}) {
      const entity = await this.find();
      const sanitizedData = sanitizeInput(data);

      if (!entity) {
        return strapi.entityService.create({ data: sanitizedData, files }, { model: modelName });
      } else {
        return strapi.entityService.update(
          {
            params: {
              id: entity.id,
            },
            data: sanitizedData,
            files,
          },
          { model: modelName }
        );
      }
    },

    /**
     * Deletes the single type content
     *
     * @return {Promise}
     */
    async delete() {
      const entity = await this.find();

      if (!entity) return;

      return strapi.entityService.delete({ params: { id: entity.id } }, { model: modelName });
    },
  };
};

/**
 *
 * Returns a collection type service to handle default core-api actions
 */
const createCollectionTypeService = ({ model, strapi }) => {
  const { modelName } = model;
  const { sanitizeInput } = createUtils({ model });

  return {
    /**
     * Promise to fetch all records
     *
     * @return {Promise}
     */
    find(params, populate) {
      return strapi.entityService.find(
        { params: getFetchParams(params), populate },
        { model: modelName }
      );
    },

    /**
     * Promise to fetch record
     *
     * @return {Promise}
     */

    findOne(params, populate) {
      return strapi.entityService.findOne(
        { params: getFetchParams(params), populate },
        { model: modelName }
      );
    },

    /**
     * Promise to count record
     *
     * @return {Promise}
     */

    count(params) {
      return strapi.entityService.count({ params: getFetchParams(params) }, { model: modelName });
    },

    /**
     * Promise to add record
     *
     * @return {Promise}
     */

    create(data, { files } = {}) {
      const sanitizedData = sanitizeInput(data);
      if (hasDraftAndPublish(model)) {
        sanitizedData[PUBLISHED_AT_ATTRIBUTE] = _.get(
          sanitizedData,
          PUBLISHED_AT_ATTRIBUTE,
          new Date()
        );
      }
      return strapi.entityService.create({ data: sanitizedData, files }, { model: modelName });
    },

    /**
     * Promise to edit record
     *
     * @return {Promise}
     */

    update(params, data, { files } = {}) {
      const sanitizedData = sanitizeInput(data);
      return strapi.entityService.update(
        { params, data: sanitizedData, files },
        { model: modelName }
      );
    },

    /**
     * Promise to delete a record
     *
     * @return {Promise}
     */

    delete(params) {
      return strapi.entityService.delete({ params }, { model: modelName });
    },

    /**
     * Promise to search records
     *
     * @return {Promise}
     */

    search(params) {
      return strapi.entityService.search({ params }, { model: modelName });
    },

    /**
     * Promise to count searched records
     *
     * @return {Promise}
     */
    countSearch(params) {
      return strapi.entityService.countSearch(
        { params: getFetchParams(params) },
        { model: modelName }
      );
    },
  };
};

module.exports = createCoreService;
