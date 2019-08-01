'use strict';

const uploadFiles = require('./utils/upload-files');

/**
 * default service
 *
 */

module.exports = ({ model, strapi }) => {
  return {
    /**
     * expose some utils so the end users can use them
     */
    uploadFiles,
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

    async create(data, { files } = {}) {
      const entry = await strapi.query(model).create(data);

      if (files) {
        await this.uploadFiles(entry, files, { model });
        return this.findOne({ id: entry.id });
      }

      return entry;
    },

    /**
     * Promise to edit record
     *
     * @return {Promise}
     */

    async update(params, data, { files } = {}) {
      const entry = await strapi.query(model).update(params, data);

      if (files) {
        await this.uploadFiles(entry, files, { model });
        return this.findOne({ id: entry.id });
      }

      return entry;
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
