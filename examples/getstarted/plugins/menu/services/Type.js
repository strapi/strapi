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
    return strapi.query('type', 'menu').find(params, populate);
  },

  /**
   * Promise to search records
   *
   * @return {Promise}
   */
  search(params) {
    return strapi.query('type', 'menu').search(params);
  },

  /**
   * Promise to fetch record
   *
   * @return {Promise}
   */
  findOne(params, populate) {
    return strapi.query('type', 'menu').findOne(params, populate);
  },

  /**
   * Promise to edit record
   *
   * @return {Promise}
   */

  async update(params, data, { files } = {}) {
    const entry = await strapi.query('type', 'menu').update(params, data);

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: 'type',
        plugin: 'menu'
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },
};
