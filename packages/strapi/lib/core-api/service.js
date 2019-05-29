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
      return strapi.query(model).find(params, populate);
    },

    /**
     * Promise to fetch record
     *
     * @return {Promise}
     */

    findOne(params, populate) {
      return strapi.query(model).findOne(params, populate);
    },

    /**
     * Promise to count record
     *
     * @return {Promise}
     */

    count(params) {
      return strapi.query(model).count(params);
    },

    /**
     * Promise to add record
     *
     * @return {Promise}
     */

    create(values) {
      return strapi.query(model).create(values);
    },

    /**
     * Promise to edit record
     *
     * @return {Promise}
     */

    update(params, values) {
      return strapi.query(model).update(params, values);
    },

    /**
     * Promise to delete a record
     *
     * @return {Promise}
     */

    delete(params) {
      return strapi.query(model).delete(params);
    },

    /**
     * Promise to search records
     *
     * @return {Promise}
     */

    search(params) {
      return strapi.query(model).search(params);
    },

    /**
     * Promise to count searched records
     *
     * @return {Promise}
     */
    countSearch(params) {
      return strapi.query(model).countSearch(params);
    },
  };
};
