const _ = require('lodash');
const { yup } = require('strapi-utils');
const { validateRegisterProviderPermission } = require('../validation/permission-provider');

const calculateId = permission => {
  let id = '';
  const sanitizedname = _.snakeCase(permission.name).replace(/_/g, '.');
  if (permission.pluginName === 'admin') {
    id = `admin::${sanitizedname}`;
  } else {
    id = `plugins::${permission.pluginName}.${sanitizedname}`;
  }
  return id;
};

const formatPermissionToBeRegistered = permission => {
  const formattedPermission = _.clone(permission);
  formattedPermission.permissionId = calculateId(permission);
  formattedPermission.conditions = permission.conditions || [];

  if (['settings', 'plugins'].includes(permission.section)) {
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

const formatPermissionsToNestedFormat = formattedPermissions => {
  const sections = formattedPermissions.reduce((result, p) => {
    const checkboxItem = {
      displayName: p.displayName,
      action: p.permissionId,
    };

    switch (p.section) {
      case 'contentTypes':
        checkboxItem.subjects = p.subjects;
        break;
      case 'plugins':
        checkboxItem.subCategory = p.subCategory;
        checkboxItem.plugin = `plugin::${p.pluginName}`;
        break;
      case 'settings':
        checkboxItem.category = p.category;
        checkboxItem.subCategory = p.subCategory;
        break;
      case 'default':
        throw new Error(`Unknown section ${p.section}`);
    }

    result[p.section] = result[p.section] || [];
    result[p.section].push(checkboxItem);

    return result;
  }, {});

  return {
    sections,
    conditions: [],
  };
};

class PermissionProvider {
  constructor() {
    this.permissions = [];
    this.permissionsWithNestedFormat = {};
  }

  getAll() {
    return _.cloneDeep(this.permissions);
  }

  getAllWithNestedFormat() {
    return _.cloneDeep(this.permissionsWithNestedFormat);
  }

  register(newPermissions) {
    validateRegisterProviderPermission(newPermissions);
    const newPermissionsWithIds = newPermissions.map(formatPermissionToBeRegistered);
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
    this.permissionsWithNestedFormat = formatPermissionsToNestedFormat(mergedPermissions);
  }
}

const createPermissionProvider = () => new PermissionProvider();

module.exports = {
  createPermissionProvider,
};
