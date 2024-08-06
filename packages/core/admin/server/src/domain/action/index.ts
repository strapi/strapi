import type { Utils } from '@strapi/types';

import { curry, pipe, merge, set, pick, omit, includes, isArray, prop } from 'lodash/fp';

export interface ActionAlias {
  /**
   * The action ID to alias
   */
  actionId: string;

  /**
   * An optional array of subject to restrict the alias usage
   */
  subjects?: string[];
}

export type Action = {
  /**
   * The unique identifier of the action
   */
  actionId: string;

  /**
   * The section linked to the action - These can be 'contentTypes' | 'plugins' | 'settings' | 'internal'
   */
  section: string;

  /**
   * The human readable name of an action
   */
  displayName: string;

  /**
   * The main category of an action
   */
  category: string;

  /**
   * The secondary category of an action (only for settings and plugins section)
   */
  subCategory?: string;

  /**
   * The plugin that provides the action
   */
  pluginName?: string;

  /**
   * A list of subjects on which the action can be applied
   */
  subjects?: string[];

  /**
   * The options of an action
   */
  options: {
    /**
     * The list of properties that can be associated with an action
     */
    applyToProperties: string[] | null;
  };

  /**
   * An optional array of @see {@link ActionAlias}.
   *
   * It represents the possible aliases for the current action.
   *
   * Aliases are unidirectional.
   *
   * Note: This is an internal property and probably shouldn't be used outside Strapi core features.
   *       Its behavior might change at any time without notice.
   *
   * @internal
   */
  aliases?: ActionAlias[];
};

/**
 * Set of attributes used to create a new {@link Action} object
 * @typedef {Action, { uid: string }} CreateActionPayload
 */
export type CreateActionPayload = Utils.Intersect<
  [
    Utils.Object.PartialBy<
      // Action Id is computed from the uid value
      Omit<Action, 'actionId'>,
      // Options is filled with default values
      'options'
    >,
    { uid: string },
  ]
>;

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
  'aliases',
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
