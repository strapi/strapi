'use strict';

/**
 * Transform an array of actions to a more nested format
 * @param {Array<Action>} actions - array of actions
 * @returns {Object} "{ contentTypes, plugins, settings }"
 */
const formatActionsBySections = (actions) =>
  actions.reduce((result, p) => {
    const checkboxItem = {
      displayName: p.displayName,
      action: p.actionId,
    };

    switch (p.section) {
      case 'contentTypes': {
        checkboxItem.subjects = p.subjects;
        break;
      }
      case 'plugins': {
        checkboxItem.subCategory = p.subCategory;
        checkboxItem.plugin = `plugin::${p.pluginName}`;
        break;
      }
      case 'settings': {
        checkboxItem.category = p.category;
        checkboxItem.subCategory = p.subCategory;
        break;
      }
      default:
        throw new Error(`Unknown section ${p.section}`);
    }

    result[p.section] = result[p.section] || [];
    result[p.section].push(checkboxItem);

    return result;
  }, {});

module.exports = formatActionsBySections;
