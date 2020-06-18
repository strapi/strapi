'use strict';

/**
 * MenuEditorPlugin.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

module.exports = {
  /**
   * Promise to fetch all records
   *
   * @return {Promise}
   */
  find(params, populate) {
    return strapi.query('state', 'menu').find(params, populate);
  },

  /**
   * Promise to search records
   *
   * @return {Promise}
   */
  search(params) {
    return strapi.query('state', 'menu').search(params);
  },

  /**
   * Promise to fetch record
   *
   * @return {Promise}
   */
  findOne(params, populate) {
    return strapi.query('state', 'menu').findOne(params, populate);
  },

  /**
   * Promise to edit record
   *
   * @return {Promise}
   */

  async update(params, data, { files } = {}) {
    const entry = await strapi.query('state', 'menu').update(params, data);

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: 'state',
        plugin: 'menu'
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },
};
