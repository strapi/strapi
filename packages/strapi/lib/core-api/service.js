'use strict';

/**
 * default service
 *
 */

module.exports = ({ model, strapi }) => {
  if (model.kind === 'singleType') {
    return createSingleTypeService({ model, strapi });
  }

  return createCollectionTypeService({ model, strapi });
};

/**
 * Returns a single type service to handle default core-api actions
 */
const createSingleTypeService = ({ model, strapi }) => {
  const { modelName } = model;

  return {
    /**
     * Returns single type content
     *
     * @return {Promise}
     */
    find(populate) {
      return strapi.entityService.find({ populate }, { model: modelName });
    },

    /**
     * Creates or update the single- type content
     *
     * @return {Promise}
     */
    async createOrUpdate(data, { files } = {}) {
      const entity = await this.find();

      if (!entity) {
        return strapi.entityService.create({ data, files }, { model: modelName });
      } else {
        return strapi.entityService.update(
          {
            params: {
              id: entity.id,
            },
            data,
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

  return {
    /**
     * Promise to fetch all records
     *
     * @return {Promise}
     */
    find(params, populate) {
      return strapi.entityService.find({ params, populate }, { model: modelName });
    },

    /**
     * Promise to fetch record
     *
     * @return {Promise}
     */

    findOne(params, populate) {
      return strapi.entityService.findOne({ params, populate }, { model: modelName });
    },

    /**
     * Promise to count record
     *
     * @return {Promise}
     */

    count(params) {
      return strapi.entityService.count({ params }, { model: modelName });
    },

    /**
     * Promise to add record
     *
     * @return {Promise}
     */

    create(data, { files } = {}) {
      return strapi.entityService.create({ data, files }, { model: modelName });
    },

    /**
     * Promise to edit record
     *
     * @return {Promise}
     */

    update(params, data, { files } = {}) {
      return strapi.entityService.update({ params, data, files }, { model: modelName });
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
      return strapi.entityService.countSearch({ params }, { model: modelName });
    },
  };
};
