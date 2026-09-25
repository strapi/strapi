import _ from 'lodash';

const PERMISSION_FIELDS = ['action', 'subject', 'properties', 'conditions'] as const;

/** Retains only fields supported by the permission domain. */
const sanitizePermissionFields = <T extends Partial<Permission>>(permission: T) =>
  _.pick(permission, PERMISSION_FIELDS);

export interface Permission {
  action: string;
  actionParameters?: Record<string, unknown>;
  subject?: string | object | null;
  properties?: Record<string, any>;
  conditions?: string[];
}

/**
 * Creates a permission with default values for optional properties
 */
const getDefaultPermission = (): Required<
  Pick<Permission, 'conditions' | 'properties' | 'subject'>
> => ({
  conditions: [],
  properties: {},
  subject: null,
});

/**
 * Create a new permission based on given attributes
 *
 * @param {object} attributes
 */
const create = <T extends Partial<Permission>>(attributes: T) =>
  _.merge(getDefaultPermission(), sanitizePermissionFields(attributes));

/**
 * Add a condition to a permission
 */
const addCondition = _.curry((condition: string, permission: Permission): Permission => {
  const { conditions } = permission;

  const newConditions = Array.isArray(conditions)
    ? [...new Set(conditions.concat(condition))]
    : [condition];

  return { ...permission, conditions: newConditions };
});

/**
 * Gets a property or a part of a property from a permission.
 */
const getProperty = _.curry(
  <T extends keyof Permission['properties']>(
    property: T,
    permission: Permission
  ): Permission['properties'][T] => _.get(permission, `properties.${property}`)
);

export { create, sanitizePermissionFields, addCondition, getProperty };
