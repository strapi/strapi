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
    return strapi.query('item', 'menu').find(params, populate);
  },

  /**
   * Promise to search records
   *
   * @return {Promise}
   */
  search(params) {
    return strapi.query('item', 'menu').search(params);
  },

  /**
   * Promise to fetch record
   *
   * @return {Promise}
   */
  findOne(params, populate) {
    return strapi.query('item', 'menu').findOne(params, populate);
  },

  /**
   * Promise to edit record
   *
   * @return {Promise}
   */

  async update(params, data, { files } = {}) {
    const entry = await strapi.query('item', 'menu').update(params, data);

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: 'item',
        plugin: 'menu',
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },

  /**
   * Promise to add record
   *
   * @return {Promise}
   */

  async create(data, { files } = {}) {
    const entry = await strapi.query('item', 'menu').create(data);

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: 'item',
        plugin: 'menu',
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },

  async updateMany(data) {
    let entry = [];
    for (const item of data) {
      const { child_order, parent, title, menu_type, menu_state, newItem, id } = item;

      const transformedItem = {
        child_order,
        parent,
        title,
        menu_type,
        menu_state,
      };

      if (newItem === true) {
        entry.push(strapi.query('item', 'menu').create(transformedItem));
      } else {
        entry.push(strapi.query('item', 'menu').update({ id }, transformedItem));
      }
    }

    return await Promise.all(entry);
  },
};
