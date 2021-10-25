'use strict';

/**
 * @typedef {import('@strapi/admin').AdminAction} AdminAction
 */

const { curry, pipe, merge, set, pick, omit, includes, isArray, prop } = require('lodash/fp');

/**
 * Set of attributes used to create a new {@link AdminAction} object
 * @typedef {AdminAction & { uid: string }} CreateActionPayload
 */

/**
 * Return the default attributes of a new {@link AdminAction}
 */
const getDefaultActionAttributes = () => ({
  options: {
    applyToProperties: null,
  },
});

/**
 * Get the list of all the valid attributes of an {@link AdminAction}
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
 * Remove unwanted attributes from an {@link AdminAction}
 * @type {(action: AdminAction | CreateActionPayload) => Partial<AdminAction>}
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
    return `api::${uid}`;
  }

  if (pluginName === 'admin') {
    return `admin::${uid}`;
  }

  return `plugin::${pluginName}.${uid}`;
};

/**
 * Assign an actionId attribute to an {@link CreateActionPayload} object
 * @param {CreateActionPayload} attrs - Payload used to create an action
 * @return {CreateActionPayload}
 */
const assignActionId = attrs => set('actionId', computeActionId(attrs), attrs);

/**
 * Transform an action by adding or removing the {@link AdminAction.subCategory} attribute
 * @param {AdminAction} action - The action to process
 * @return {AdminAction}
 */
const assignOrOmitSubCategory = action => {
  const shouldHaveSubCategory = ['settings', 'plugins'].includes(action.section);

  return shouldHaveSubCategory
    ? set('subCategory', action.subCategory || 'general', action)
    : omit('subCategory', action);
};

/**
 * Check if a property can be applied to an {@link AdminAction}
 * @type (function(property: string, action: AdminAction): boolean) | (function(property: string): (function(action: AdminAction): boolean))
 * @return {boolean} Return true if the property can be applied for the given action
 */
const appliesToProperty = curry((property, action) => {
  return pipe(
    prop('options.applyToProperties'),
    includes(property)
  )(action);
});

/**
 * Check if an action applies to a subject
 * @param {string} subject
 * @param {AdminAction} action
 * @return {boolean}
 */
const appliesToSubject = curry((subject, action) => {
  return isArray(action.subjects) && includes(subject, action.subjects);
});

/**
 * Transform the given attributes into a domain representation of an AdminAction
 * @type {(payload: CreateActionPayload) => Partial<AdminAction>}
 * @param {CreateActionPayload} payload - The action payload containing the attributes needed to create an {@link AdminAction}
 * @return {Partial<AdminAction>} A newly created {@link AdminAction}
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
