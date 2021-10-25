'use strict';

/**
 * Transform an array of actions to a more nested format
 * @param {any[]} actions - array of actions
 */
const formatActionsBySections = actions =>
  actions.reduce((result, p) => {
    const checkboxItem = {
      displayName: p.displayName,
      action: p.actionId,
      /**
       * @type {any=}
       */
      subjects: undefined,
      /**
       * @type {any=}
       */
      subCategory: undefined,
      /**
       * @type {any=}
       */
      category: undefined,
      /**
       * @type {string=}
       */
      plugin: undefined,
    };

    switch (p.section) {
      case 'contentTypes':
        checkboxItem.subjects = p.subjects;
        break;
      case 'plugins':
        checkboxItem.subCategory = p.subCategory;
        checkboxItem.plugin = `plugin::${p.pluginName}`;
        break;
      case 'settings':
        checkboxItem.category = p.category;
        checkboxItem.subCategory = p.subCategory;
        break;
      case 'default':
        throw new Error(`Unknown section ${p.section}`);
    }

    result[p.section] = result[p.section] || [];
    result[p.section].push(checkboxItem);

    return result;
  }, {});

module.exports = formatActionsBySections;
