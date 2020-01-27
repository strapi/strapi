'use strict';

/**
 * default service
 *
 */

module.exports = ({ model, strapi }) => {
  const { modelName } = model;

  if (model.kind === 'singleType') {
    return {
      find(populate) {
        return strapi.entityService.find({ populate }, { model: modelName });
      },

      async createOrUpdate(data, { files } = {}) {
        const entity = await this.find();

        if (!entity) {
          return strapi.entityService.create(
            { data, files },
            { model: modelName }
          );
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

      async delete() {
        const entity = await this.find();

        if (!entity) return;

        return strapi.entityService.delete(
          { params: { id: entity.id } },
          { model: modelName }
        );
      },
    };
  }

  return {
    /**
     * Promise to fetch all records
     *
     * @return {Promise}
     */
    find(params, populate) {
      return strapi.entityService.find(
        { params, populate },
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
        { params, populate },
        { model: modelName }
      );
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
      return strapi.entityService.update(
        { params, data, files },
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
      return strapi.entityService.countSearch({ params }, { model: modelName });
    },
  };
};
