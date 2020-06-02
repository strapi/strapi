const _ = require('lodash');
const { yup } = require('strapi-utils');
const { validateRegisterProviderPermission } = require('../validation/permission-provider');

const calculateId = permission => {
  let id = '';
  const sanitizedname = _.snakeCase(permission.name).replace('_', '.');
  if (permission.pluginName === 'admin') {
    id = `admin::${sanitizedname}`;
  } else {
    id = `plugins::${permission.pluginName}.${sanitizedname}`;
  }
  return id;
};

const formatPermission = permission => {
  const formattedPermission = _.clone(permission);
  formattedPermission.permissionId = calculateId(permission);
  formattedPermission.conditions = permission.conditions || [];

  if (permission.section === 'settings') {
    formattedPermission.subCategory = permission.subCategory || 'general';
  }

  return formattedPermission;
};

const getDuplicatedIds = permissions => {
  const duplicatedIds = [];
  const ids = [];
  permissions.forEach(p => {
    if (ids.includes(p.permissionId)) {
      duplicatedIds.push(p.permissionId);
    } else {
      ids.push(p.permissionId);
    }
  });

  return duplicatedIds;
};

class PermissionProvider {
  constructor() {
    this.permissions = [];
  }

  getPermissions() {
    return _.cloneDeep(this.permissions);
  }

  register(newPermissions) {
    validateRegisterProviderPermission(newPermissions);
    const newPermissionsWithIds = newPermissions.map(formatPermission);
    const mergedPermissions = [...this.permissions, ...newPermissionsWithIds];
    const duplicatedIds = getDuplicatedIds(mergedPermissions);

    if (duplicatedIds.length > 0) {
      strapi.stopWithError(
        new yup.ValidationError(
          `Duplicated permission keys: ${duplicatedIds.join(
            ', '
          )}. You may want to change the permissions name.`
        )
      );
    }

    this.permissions = mergedPermissions;
  }
}

const createPermissionProvider = () => new PermissionProvider();

module.exports = {
  createPermissionProvider,
};
