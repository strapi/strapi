import type { Utils } from '@strapi/types';

import { providerFactory } from '@strapi/utils';
import {
  pipe,
  set,
  pick,
  eq,
  omit,
  remove,
  get,
  uniq,
  isArray,
  map,
  curry,
  merge,
} from 'lodash/fp';
import { Permission } from '../../../../shared/contracts/shared';
import { SanitizedPermission } from '../../../../shared/contracts/roles';

export type CreatePermissionPayload = Utils.Object.PartialBy<
  Permission,
  'actionParameters' | 'conditions' | 'properties' | 'subject' | 'id' | 'createdAt' | 'updatedAt'
>;

type Provider = ReturnType<typeof providerFactory>;

export const permissionFields = [
  'id',
  'action',
  'actionParameters',
  'subject',
  'properties',
  'conditions',
  'role',
];
export const sanitizedPermissionFields = [
  'id',
  'action',
  'actionParameters',
  'subject',
  'properties',
  'conditions',
] as const;

export const sanitizePermissionFields: (p: Permission) => SanitizedPermission =
  pick(sanitizedPermissionFields);

/**
 * Creates a permission with default values
 */
const getDefaultPermission = () => ({
  actionParameters: {},
  conditions: [],
  properties: {},
  subject: null,
});

/**
 * Returns a new permission with the given condition
 * @param condition - The condition to add
 * @param permission - The permission on which we want to add the condition
 * @return
 */
export const addCondition = curry((condition: string, permission: Permission): Permission => {
  const { conditions } = permission;
  const newConditions = Array.isArray(conditions)
    ? uniq(conditions.concat(condition))
    : [condition];

  return set('conditions', newConditions, permission);
});

/**
 * Returns a new permission without the given condition
 * @param condition - The condition to remove
 * @param permission - The permission on which we want to remove the condition
 */
export const removeCondition = curry((condition: string, permission: Permission): Permission => {
  return set('conditions', remove(eq(condition), permission.conditions), permission);
});

/**
 * Gets a property or a part of a property from a permission.
 * @param property - The property to get
 * @param permission - The permission on which we want to access the property
 */
export const getProperty = curry(
  (property: string, permission: Permission): Permission =>
    get(`properties.${property}`, permission)
);

/**
 * Set a value for a given property on a new permission object
 * @param property - The name of the property
 * @param value - The value of the property
 * @param permission - The permission on which we want to set the property
 */
export const setProperty = (
  property: string,
  value: unknown,
  permission: Permission
): Permission => {
  return set(`properties.${property}`, value, permission);
};

/**
 * Returns a new permission without the given property name set
 * @param property - The name of the property to delete
 * @param permission - The permission on which we want to remove the property
 */
export const deleteProperty = <TProperty extends string>(
  property: TProperty,
  permission: Permission
) => omit(`properties.${property}`, permission) as Omit<Permission, TProperty>;

/**
 * Creates a new {@link Permission} object from raw attributes. Set default values for certain fields
 * @param  attributes
 */
export const create = (attributes: CreatePermissionPayload) => {
  return pipe(pick(permissionFields), merge(getDefaultPermission()))(attributes) as Permission;
};

/**
 * Using the given condition provider, check and remove invalid condition from the permission's condition array.
 * @param provider - The condition provider used to do the checks
 * @param permission - The condition to sanitize
 */
export const sanitizeConditions = curry(
  (provider: Provider, permission: Permission): Permission => {
    if (!isArray(permission.conditions)) {
      return permission;
    }

    return permission.conditions
      .filter((condition: string) => !provider.has(condition))
      .reduce(
        (perm: Permission, condition: string) => removeCondition(condition, perm),
        permission
      );
  }
);

/**
 * Transform raw attributes into valid permissions using the create domain function.
 * @param  payload - Can either be a single object of attributes or an array of those objects.
 */

function toPermission<T extends CreatePermissionPayload>(payload: T[]): Permission[];
function toPermission<T extends CreatePermissionPayload>(payload: T): Permission;
function toPermission<T extends CreatePermissionPayload>(
  payload: T[] | T
): Permission[] | Permission {
  if (isArray(payload)) {
    return map((value) => create(value), payload);
  }

  return create(payload);
}

export { toPermission };

export default {
  addCondition,
  removeCondition,
  create,
  deleteProperty,
  permissionFields,
  getProperty,
  sanitizedPermissionFields,
  sanitizeConditions,
  sanitizePermissionFields,
  setProperty,
  toPermission,
};
