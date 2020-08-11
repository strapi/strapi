'use strict';

const _ = require('lodash');

const actionFields = [
  'section',
  'displayName',
  'category',
  'subCategory',
  'pluginName',
  'subjects',
  'conditions',
  'options',
];

const defaultAction = {
  options: {
    fieldsGranularity: true,
  },
};

/**
 * Return a prefixed id that depends on the pluginName
 * @param {Object} params
 * @param {Object} params.pluginName - pluginName on which the action is related
 * @param {Object} params.uid - uid defined by the developer
 */
const getActionId = ({ pluginName, uid }) => {
  if (pluginName === 'admin') {
    return `admin::${uid}`;
  } else if (pluginName) {
    return `plugins::${pluginName}.${uid}`;
  }

  return `application::${uid}`;
};

/**
 * Create a permission action
 * @param {Object} attributes - action attributes
 */
function createAction(attributes) {
  const action = _.cloneDeep(_.pick(attributes, actionFields));
  action.actionId = getActionId(attributes);

  if (['settings', 'plugins'].includes(attributes.section)) {
    action.subCategory = attributes.subCategory || 'general';
  }

  return _.merge(action, defaultAction);
}

module.exports = {
  getActionId,
  createAction,
};
