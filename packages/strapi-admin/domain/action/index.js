'use strict';

const { curry, pipe, merge, set, pick, omit, includes, isArray, prop } = require('lodash/fp');

/**
 * Domain representation of an Action (RBAC)
 * @typedef {Object} Action
 * @property {string} actionId - The unique identifier of the action
 * @property {string} section - The section linked to the action
 * @property {string} displayName - The human readable name of an action
 * @property {string} category - The main category of an action
 * @property {string} [subCategory] - The secondary category of an action (only for settings and plugins section)
 * @property {string} [pluginName] - The plugin which provide the action
 * @property {string[]} [subjects] - A list of subjects on which the action can be applied
 * @property {Object} options - The options of an action
 * @property {string[]} options.applyToProperties - The list of properties that can be associated with an action
 */

/**
 * Set of attributes used to create a new {@link Action} object
 * @typedef {Action, { uid: string }} CreateActionPayload
 */

/**
 * Return the default attributes of a new {@link Action}
 * @return Partial<Action>
 */
const getDefaultActionAttributes = () => ({
  options: {
    applyToProperties: null,
  },
});

/**
 * Get the list of all the valid attributes of an {@link Action}
 * @return {string[]}
 */
const actionFields = [
  'section',
  'displayName',
  'category',
  'subCategory',
  'pluginName',
  'subjects',
  'options',
  'actionId',
];

/**
 * Remove unwanted attributes from an {@link Action}
 * @type {function(action: Action | CreateActionPayload): Action}
 */
const sanitizeActionAttributes = pick(actionFields);

/**
 * Create and return an identifier for an {@link CreateActionPayload}.
 * The format is based on the action's source ({@link CreateActionPayload.pluginName} or 'application') and {@link CreateActionPayload.uid}.
 * @param {CreateActionPayload} attributes
 * @return {string}
 */
const computeActionId = attributes => {
  const { pluginName, uid } = attributes;

  if (!pluginName) {
    return `application::${uid}`;
  }

  if (pluginName === 'admin') {
    return `admin::${uid}`;
  }

  return `plugins::${pluginName}.${uid}`;
};

/**
 * Assign an actionId attribute to an {@link CreateActionPayload} object
 * @param {CreateActionPayload} attrs - Payload used to create an action
 * @return {CreateActionPayload}
 */
const assignActionId = attrs => set('actionId', computeActionId(attrs), attrs);

/**
 * Transform an action by adding or removing the {@link Action.subCategory} attribute
 * @param {Action} action - The action to process
 * @return {Action}
 */
const assignOrOmitSubCategory = action => {
  const shouldHaveSubCategory = ['settings', 'plugins'].includes(action.section);

  return shouldHaveSubCategory
    ? set('subCategory', action.subCategory || 'general', action)
    : omit('subCategory', action);
};

/**
 * Check if a property can be applied to an {@link Action}
 * @type (function(property: string, action: Action): boolean) | (function(property: string): (function(action: Action): boolean))
 * @return {boolean} Return true if the property can be applied for the given action
 */
const appliesToProperty = curry((property, action) => {
  return pipe(prop('options.applyToProperties'), includes(property))(action);
});

/**
 * Check if an action applies to a subject
 * @param {string} subject
 * @param {Action} action
 * @return {boolean}
 */
const appliesToSubject = curry((subject, action) => {
  return isArray(action.subjects) && includes(subject, action.subjects);
});

/**
 * Transform the given attributes into a domain representation of an Action
 * @type (function(payload: CreateActionPayload): Action)
 * @param {CreateActionPayload} payload - The action payload containing the attributes needed to create an {@link Action}
 * @return {Action} A newly created {@link Action}
 */
const create = pipe(
  // Create and assign an action identifier to the action
  // (need to be done before the sanitizeActionAttributes since we need the uid here)
  assignActionId,
  // Add or remove the sub category field based on the pluginName attribute
  assignOrOmitSubCategory,
  // Remove unwanted attributes from the payload
  sanitizeActionAttributes,
  // Complete the action creation by adding default values for some attributes
  merge(getDefaultActionAttributes())
);

module.exports = {
  actionFields,
  appliesToProperty,
  appliesToSubject,
  assignActionId,
  assignOrOmitSubCategory,
  create,
  computeActionId,
  getDefaultActionAttributes,
  sanitizeActionAttributes,
};
