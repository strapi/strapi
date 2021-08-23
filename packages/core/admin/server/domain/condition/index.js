'use strict';

const { pipe, merge, set, pick } = require('lodash/fp');

/**
 * The handler of a {@link Condition}
 * @typedef {(function(user: Object, options: Object): Object | boolean)} ConditionHandler
 */
/**
 * Domain representation of a Condition (RBAC)
 * @typedef {Object} Condition
 * @property {string} id - The identifier of the condition
 * @property {string} displayName - The display name of a condition
 * @property {string} name - The name of a condition
 * @property {string} [plugin] - The plugin which provide the condition
 * @property {string} [category] - The main category of a condition
 * @property {ConditionHandler} handler - The handler of a condition
 */

/**
 * Set of attributes used to create a new {@link Action} object
 * @typedef {Condition, { uid: string }} CreateConditionPayload
 */

const DEFAULT_CATEGORY = 'default';

/**
 * Get the default value used for every condition
 * @return {Condition}
 */
const getDefaultConditionAttributes = () => ({
  category: DEFAULT_CATEGORY,
});

/**
 * Get the list of all the valid attributes of a {@link Condition}
 * @return {string[]}
 */
const conditionFields = ['id', 'displayName', 'handler', 'plugin', 'category'];

/**
 * Remove unwanted attributes from a {@link Condition}
 * @type {function(action: Condition | CreateConditionPayload): Condition}
 */
const sanitizeConditionAttributes = pick(conditionFields);

/**
 *
 * @param condition
 * @return {string}
 */
const computeConditionId = condition => {
  const { name, plugin } = condition;

  if (!plugin) {
    return `api::${name}`;
  }

  if (plugin === 'admin') {
    return `admin::${name}`;
  }

  return `plugin::${plugin}.${name}`;
};

/**
 * Assign an id attribute to a {@link CreateConditionPayload} object
 * @param {CreateConditionPayload} attrs - Payload used to create a condition
 * @return {CreateConditionPayload}
 */
const assignConditionId = attrs => set('id', computeConditionId(attrs), attrs);

/**
 * Transform the given attributes into a domain representation of a Condition
 * @type (function(CreateConditionPayload): Condition)
 * @param {CreateConditionPayload} payload - The condition payload containing the attributes needed to create a {@link Condition}
 * @return {Condition}
 */
const create = pipe(
  assignConditionId,
  sanitizeConditionAttributes,
  merge(getDefaultConditionAttributes())
);

module.exports = {
  assignConditionId,
  computeConditionId,
  conditionFields,
  create,
  getDefaultConditionAttributes,
  sanitizeConditionAttributes,
};
