import _ from 'lodash/fp.js';

const PERMISSION_FIELDS = ['action', 'subject', 'properties', 'conditions'] as const;

const sanitizePermissionFields = _.pick(PERMISSION_FIELDS);

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
const getDefaultPermission = (): Pick<Permission, 'conditions' | 'properties' | 'subject'> => ({
  conditions: [],
  properties: {},
  subject: null,
});

/**
 * Create a new permission based on given attributes
 *
 * @param {object} attributes
 */
const create = _.pipe(_.pick(PERMISSION_FIELDS), _.merge(getDefaultPermission()));

/**
 * Add a condition to a permission
 */
const addCondition = _.curry((condition: string, permission: Permission): Permission => {
  const { conditions } = permission;

  const newConditions = Array.isArray(conditions)
    ? [...new Set(conditions.concat(condition))]
    : [condition];

  return _.set('conditions', newConditions, permission);
});

/**
 * Gets a property or a part of a property from a permission.
 */
const getProperty = _.curry(
  <T extends keyof Permission['properties']>(
    property: T,
    permission: Permission
  ): Permission['properties'][T] =>
    // [lodash: get — skipped, dynamic template path `properties.${property}`]
    // eslint-disable-next-line you-dont-need-lodash-underscore/get
    _.get(`properties.${property}`, permission)
);

export { create, sanitizePermissionFields, addCondition, getProperty };
