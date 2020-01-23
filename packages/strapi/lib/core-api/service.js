'use strict';

/**
 * default service
 *
 */

module.exports = ({ model, strapi }) => {
  return {
    /**
     * Promise to fetch all records
     *
     * @return {Promise}
     */
    find(params, populate) {
      return strapi.entityService.find({ params, populate }, { model });
    },

    /**
     * Promise to fetch record
     *
     * @return {Promise}
     */

    findOne(params, populate) {
      return strapi.entityService.findOne({ params, populate }, { model });
    },

    /**
     * Promise to count record
     *
     * @return {Promise}
     */

    count(params) {
      return strapi.entityService.count({ params }, { model });
    },

    /**
     * Promise to add record
     *
     * @return {Promise}
     */

    create(data, { files } = {}) {
      return strapi.entityService.create({ data, files }, { model });
    },

    /**
     * Promise to edit record
     *
     * @return {Promise}
     */

    update(params, data, { files } = {}) {
      return strapi.entityService.update({ params, data, files }, { model });
    },

    /**
     * Promise to delete a record
     *
     * @return {Promise}
     */

    delete(params) {
      return strapi.entityService.delete({ params }, { model });
    },

    /**
     * Promise to search records
     *
     * @return {Promise}
     */

    search(params) {
      return strapi.entityService.search({ params }, { model });
    },

    /**
     * Promise to count searched records
     *
     * @return {Promise}
     */
    countSearch(params) {
      return strapi.entityService.countSearch({ params }, { model });
    },
  };
};
