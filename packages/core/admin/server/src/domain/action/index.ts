import { curry, pipe, merge, set, pick, omit, includes, isArray, prop } from 'lodash/fp';
import { Utils } from '@strapi/types';

export type Action = {
  actionId: string; // The unique identifier of the action
  section: string; // The section linked to the action - These can be 'contentTypes' | 'plugins' | 'settings' | 'internal'
  displayName: string; // The human readable name of an action
  category: string; // The main category of an action
  subCategory?: string; // The secondary category of an action (only for settings and plugins section)
  pluginName?: string; // The plugin which provide the action
  subjects?: string[]; // A list of subjects on which the action can be applied
  options: {
    // The options of an action
    applyToProperties: string[] | null; // The list of properties that can be associated with an action
  };
};

/**
 * Set of attributes used to create a new {@link Action} object
 * @typedef {Action, { uid: string }} CreateActionPayload
 */
export type CreateActionPayload = Utils.Object.PartialBy<
  // Action Id is computed from the uid value
  Omit<Action, 'actionId'>,
  // Options is filled with default values
  'options'
> & {
  uid: string;
};

/**
 * Return the default attributes of a new {@link Action}
 * @return Partial<Action>
 */
const getDefaultActionAttributes = (): Partial<Action> => ({
  options: {
    applyToProperties: null,
  },
});

/**
 * Get the list of all the valid attributes of an {@link Action}
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
] as const;

/**
 * Remove unwanted attributes from an {@link Action}
 */
const sanitizeActionAttributes = pick(actionFields) as (
  action: Action | CreateActionPayload
) => Action;

/**
 * Create and return an identifier for an {@link CreateActionPayload}.
 * The format is based on the action's source ({@link CreateActionPayload.pluginName} or 'application') and {@link CreateActionPayload.uid}.
 * @param {CreateActionPayload} attributes
 * @return {string}
 */
// TODO: TS - Use Common.UID
const computeActionId = (attributes: CreateActionPayload): string => {
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
 */
const assignActionId = (attrs: CreateActionPayload) =>
  set('actionId', computeActionId(attrs), attrs);

/**
 * Transform an action by adding or removing the {@link Action.subCategory} attribute
 * @param {Action} action - The action to process
 * @return {Action}
 */
const assignOrOmitSubCategory = (action: Action): Action => {
  const shouldHaveSubCategory = ['settings', 'plugins'].includes(action.section);

  return shouldHaveSubCategory
    ? set('subCategory', action.subCategory || 'general', action)
    : omit('subCategory', action);
};

/**
 * Check if a property can be applied to an {@link Action}
 */
const appliesToProperty = curry((property: string, action: Action): boolean => {
  return pipe(prop('options.applyToProperties'), includes(property))(action);
});

/**
 * Check if an action applies to a subject
 */
const appliesToSubject = curry((subject: string, action: Action): boolean => {
  return isArray(action.subjects) && includes(subject, action.subjects);
});

/**
 * Transform the given attributes into a domain representation of an Action
 */
const create: (payload: CreateActionPayload) => Action = pipe(
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

export default {
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
