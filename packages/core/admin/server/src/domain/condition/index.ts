import { pipe, merge, set, pick } from 'lodash/fp';

export type Condition = {
  id: string;
  displayName: string;
  name: string;
  plugin?: string;
  category?: string;
  /**
   * The handler of a {@link Condition}
   */
  handler: (user: object, options: object) => object | boolean;
};

/**
 * Set of attributes used to create a new {@link Action} object
 */
export type CreateConditionPayload = Omit<Condition, 'id'>;

const DEFAULT_CATEGORY = 'default';

/**
 * Get the default value used for every condition
 * @return {Condition}
 */
export const getDefaultConditionAttributes = () => ({
  category: DEFAULT_CATEGORY,
});

/**
 * Get the list of all the valid attributes of a {@link Condition}
 * @return {string[]}
 */
export const conditionFields = ['id', 'displayName', 'handler', 'plugin', 'category'] as const;

/**
 * Remove unwanted attributes from a {@link Condition}
 */
export const sanitizeConditionAttributes = pick(conditionFields);

export const computeConditionId = (condition: CreateConditionPayload) => {
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
 * @param  attrs - Payload used to create a condition
 */
export const assignConditionId = (attrs: CreateConditionPayload): Condition => {
  const condition = set('id', computeConditionId(attrs), attrs) as CreateConditionPayload & {
    id: string;
  };
  return condition;
};

/**
 * Transform the given attributes into a domain representation of a Condition
 * @param payload - The condition payload containing the attributes needed to create a {@link Condition}
 */
export const create = pipe(
  assignConditionId,
  sanitizeConditionAttributes,
  merge(getDefaultConditionAttributes())
) as (payload: CreateConditionPayload) => Condition;

export default {
  assignConditionId,
  computeConditionId,
  conditionFields,
  create,
  getDefaultConditionAttributes,
  sanitizeConditionAttributes,
};
