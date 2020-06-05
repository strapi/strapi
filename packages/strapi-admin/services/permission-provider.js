const _ = require('lodash');
const { yup } = require('strapi-utils');
const { validateRegisterProviderPermission } = require('../validation/permission-provider');

// Utils
const prefixId = ({ pluginName, uid }) => {
  let id = '';
  if (pluginName === 'admin') {
    id = `admin::${uid}`;
  } else {
    id = `plugins::${pluginName}.${uid}`;
  }
  return id;
};

const formattedPermissionFields = [
  'section',
  'displayName',
  'category',
  'subCategory',
  'pluginName',
  'subjects',
  'conditions',
];

const formatPermissionToBeRegistered = permission => {
  const formattedPermission = _.cloneDeep(_.pick(permission, formattedPermissionFields));
  formattedPermission.permissionId = prefixId(permission);
  formattedPermission.conditions = formattedPermission.conditions || [];

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

// Private variables
let _permissions = [];
let _permissionsWithNestedFormat = {};

// Exported functions
const get = (pluginName, uid) => {
  const permissionId = prefixId({ pluginName, uid });
  return _permissions.find(p => p.permissionId === permissionId);
};

const getAll = () => _.cloneDeep(_permissions);

const getAllWithNestedFormat = () => _.cloneDeep(_permissionsWithNestedFormat);

const register = newPermissions => {
  validateRegisterProviderPermission(newPermissions);
  const newPermissionsWithIds = newPermissions.map(formatPermissionToBeRegistered);
  const mergedPermissions = [..._permissions, ...newPermissionsWithIds];
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

  _permissions = mergedPermissions;
  _permissionsWithNestedFormat = formatPermissionsToNestedFormat(mergedPermissions);
};

module.exports = {
  get,
  getAll,
  getAllWithNestedFormat,
  register,
};
