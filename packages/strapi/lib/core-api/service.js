'use strict';

const _ = require('lodash');
const uploadFiles = require('./utils/upload-files');
const resolveParams = (params, idAttribute) => params.id ? { ..._.omit(params, 'id'), [idAttribute]: params.id } : params

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
      return strapi.query(model).find(resolveParams(params, getIdAttribute(model)), populate);
    },

    /**
     * Promise to fetch record
     *
     * @return {Promise}
     */

    findOne(params, populate) {
      return strapi.query(model).findOne(resolveParams(params, getIdAttribute(model)), populate);
    },

    /**
     * Promise to count record
     *
     * @return {Promise}
     */

    count(params) {
      return strapi.query(model).count(resolveParams(params, getIdAttribute(model)));
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
        const idAttribute = getIdAttribute(model);
        return this.findOne({ id: entry[idAttribute] });
      }

      return entry;
    },

    /**
     * Promise to edit record
     *
     * @return {Promise}
     */

    async update(params, data, { files } = {}) {
      const idAttribute = getIdAttribute(model);
      const entry = await strapi.query(model).update(resolveParams(params, idAttribute), data);

      if (files) {
        await this.uploadFiles(entry, files, { model });
        return this.findOne({ id: entry[idAttribute] });
      }

      return entry;
    },

    /**
     * Promise to delete a record
     *
     * @return {Promise}
     */

    delete(params) {
      return strapi.query(model).delete(resolveParams(params, getIdAttribute(model)));
    },

    /**
     * Promise to search records
     *
     * @return {Promise}
     */

    search(params) {
      return strapi.query(model).search(resolveParams(params, getIdAttribute(model)));
    },

    /**
     * Promise to count searched records
     *
     * @return {Promise}
     */
    countSearch(params) {
      return strapi.query(model).countSearch(resolveParams(params, getIdAttribute(model)));
    },
  };
};
