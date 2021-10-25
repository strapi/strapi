'use strict';

const { pipe, merge, set, pick } = require('lodash/fp');

/**
 * @typedef {import('@strapi/admin').AdminCondition} AdminCondition
 */

/**
 * Set of attributes used to create a new {@link Action} object
 * @typedef {AdminCondition & { uid: string }} CreateConditionPayload
 */

const DEFAULT_CATEGORY = 'default';

/**
 * Get the default value used for every condition
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
 * @type {(action: AdminCondition | CreateConditionPayload) => Partial<AdminCondition>}
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
 */
const assignConditionId = attrs => set('id', computeConditionId(attrs), attrs);

/**
 * Transform the given attributes into a domain representation of a Condition
 * @type {(CreateConditionPayload) => Partial<AdminCondition>}
 * @param {CreateConditionPayload} payload - The condition payload containing the attributes needed to create a {@link AdminCondition}
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
