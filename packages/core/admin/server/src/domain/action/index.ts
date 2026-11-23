import { pick, includes, merge, get, curry, flow, omit } from 'lodash';
import type { Core, Utils } from '@strapi/types';
import type { z } from '@strapi/utils';
import type { actionRegistrationSchema } from '../../validation/action-provider';

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

type ActionRegistrationInput = z.input<typeof actionRegistrationSchema>;

type StoredActionOf<TRegistration> = TRegistration extends ActionRegistrationInput
  ? Omit<TRegistration, 'uid' | 'options' | 'subCategory'> & {
      actionId: string;
      options: {
        applyToProperties: NonNullable<
          NonNullable<TRegistration['options']>['applyToProperties']
        > | null;
      };
    } & (TRegistration extends { section: 'settings' | 'plugins' }
        ? { subCategory: string }
        : unknown)
  : never;

/**
 * An action as the action provider stores it ({@link create}) and hands it to its hooks and to the
 * section handlers: the registration without its `uid`, with its `actionId`, an
 * `options.applyToProperties` that defaults to `null`, and a `subCategory` that defaults to
 * `'general'` in the `settings` and `plugins` sections and is removed in the others. One member per
 * section, as the registration schema (`validation/action-provider.ts`): only `settings` actions have
 * a `category`, only `contentTypes` actions have `subjects`.
 */
export type StoredAction = StoredActionOf<ActionRegistrationInput>;

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
const sanitizeActionAttributes = (action: Action | CreateActionPayload): Action =>
  pick(action, actionFields) as Action;

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
const assignActionId = (attrs: CreateActionPayload) => ({
  ...attrs,
  actionId: computeActionId(attrs),
});

/**
 * Transform an action by adding or removing the {@link Action.subCategory} attribute
 * @param {Action} action - The action to process
 * @return {Action}
 */
const assignOrOmitSubCategory = (action: Action): Action => {
  const shouldHaveSubCategory = ['settings', 'plugins'].includes(action.section);

  return shouldHaveSubCategory
    ? { ...action, subCategory: action.subCategory || 'general' }
    : omit(action, 'subCategory');
};

/**
 * What {@link appliesToProperty} reads from an action. With strict types, it accepts a stored action
 * ({@link StoredAction}) as well as an {@link Action}.
 */
type AppliesToPropertyAction = {
  options?: { applyToProperties?: readonly (string | undefined)[] | null };
};

/**
 * Check if a property can be applied to an {@link Action}
 */
const appliesToProperty = curry(
  (
    property: string,
    action: Core.IsStrict extends true ? AppliesToPropertyAction : Action
  ): boolean => {
    return includes(get(action, 'options.applyToProperties'), property);
  }
);

/**
 * Check if an action applies to a subject
 */
const appliesToSubject = curry((subject: string, action: Action): boolean => {
  return Array.isArray(action.subjects) && action.subjects.includes(subject);
});

/**
 * Transform the given attributes into a domain representation of an Action
 */
const create: (payload: CreateActionPayload) => Action = flow(
  // Assign the action identifier before sanitization removes the uid.
  assignActionId,
  assignOrOmitSubCategory,
  sanitizeActionAttributes,
  (action) => merge({}, getDefaultActionAttributes(), action)
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
