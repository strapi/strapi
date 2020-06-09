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
];

/**
 * Return a prefixed id that depends on the pluginName
 * @param {Object} params
 * @param {Object} params.pluginName - pluginName on which the action is related
 * @param {Object} params.uid - uid defined by the developer
 */
const getActionId = ({ pluginName, uid }) => {
  let id = '';
  if (pluginName === 'admin') {
    id = `admin::${uid}`;
  } else if (pluginName) {
    id = `plugins::${pluginName}.${uid}`;
  } else {
    id = `application::${uid}`;
  }
  return id;
};

/**
 * Create a permission action
 * @param {Object} attributes - action attributes
 */
function createAction(attributes) {
  const action = _.cloneDeep(_.pick(attributes, actionFields));
  action.actionId = getActionId(attributes);
  action.conditions = action.conditions || [];

  if (['settings', 'plugins'].includes(attributes.section)) {
    action.subCategory = attributes.subCategory || 'general';
  }

  return action;
}

module.exports = {
  getActionId,
  createAction,
};
