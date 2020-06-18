'use strict';

const _ = require('lodash');
const adminActions = require('../admin-actions');

const registerPermissionActions = () => {
  const { actionProvider } = strapi.admin.services.permission;
  actionProvider.register(adminActions.actions);
};

const registerAdminConditions = () => {
  const { conditionProvider } = strapi.admin.services.permission;

  conditionProvider.register({
    displayName: 'Is Creator',
    name: 'is-creator',
    plugin: 'admin',
    handler: user => ({ 'created_by.id': user.id }),
  });
};

const cleanPermissionInDatabase = async () => {
  const { actionProvider } = strapi.admin.services.permission;
  const dbPermissions = await strapi.admin.services.permission.find();
  const allActionsMap = actionProvider.getAllByMap();
  const permissionsToRemoveIds = [];

  dbPermissions.forEach(perm => {
    if (
      !allActionsMap.has(perm.action) ||
      (allActionsMap.get(perm.action).section === 'contentTypes' &&
        !allActionsMap.get(perm.action).subjects.includes(perm.subject))
    ) {
      permissionsToRemoveIds.push(perm.id);
    }
  });

  await strapi.admin.services.permission.deleteByIds(permissionsToRemoveIds);
};

const getNestedFields = (attributes, fieldPath = '', nestingLevel = 3) => {
  if (nestingLevel === 0) {
    return fieldPath ? [fieldPath] : [];
  }

  const fields = [];
  _.forIn(attributes, (attribute, attributeName) => {
    const newFieldPath = fieldPath ? `${fieldPath}.${attributeName}` : attributeName;

    if (attribute.type === 'component') {
      const component = strapi.components[attribute.component];
      const componentFields = getNestedFields(component.attributes, newFieldPath, nestingLevel - 1);
      fields.push(...componentFields);
    } else {
      fields.push(newFieldPath);
    }
  });

  return fields;
};

const createRolesIfNeeded = async () => {
  const someRolesExist = await strapi.admin.services.role.exists();
  if (someRolesExist) {
    return;
  }

  const allActions = strapi.admin.services.permission.actionProvider.getAll();
  const contentTypesActions = allActions.filter(a => a.section === 'contentTypes');

  await strapi.admin.services.role.create({
    name: 'Super Admin',
    code: 'strapi-super-admin',
    description: 'Super Admins can access and manage all features and settings.',
  });

  const editorRole = await strapi.admin.services.role.create({
    name: 'Editor',
    code: 'strapi-editor',
    description: 'Editors can manage and publish contents including those of other users.',
  });

  const authorRole = await strapi.admin.services.role.create({
    name: 'Author',
    code: 'strapi-author',
    description: 'Authors can manage and publish the content they created.',
  });

  const editorPermissions = [];
  contentTypesActions.forEach(action => {
    _.forIn(strapi.contentTypes, contentType => {
      if (action.subjects.includes(contentType.uid)) {
        const fields = getNestedFields(contentType.attributes);
        editorPermissions.push({
          action: action.actionId,
          subject: contentType.uid,
          fields,
        });
      }
    });
  });

  const authorPermissions = _.cloneDeep(editorPermissions).map(p => ({
    ...p,
    conditions: ['admin::is-creator'],
  }));

  await strapi.admin.services.permission.assign(editorRole.id, editorPermissions);
  await strapi.admin.services.permission.assign(authorRole.id, authorPermissions);
};

const displayWarningIfNoSuperAdmin = async () => {
  const superAdminRole = await strapi.admin.services.role.getSuperAdminWithUsersCount();
  const someUsersExists = await strapi.admin.services.user.exists();
  if (!superAdminRole) {
    return strapi.log.warn("Your application doesn't have a super admin role.");
  } else if (someUsersExists && superAdminRole.usersCount === 0) {
    return strapi.log.warn("Your application doesn't have a super admin user.");
  }
};

const displayWarningIfUsersDontHaveRole = async () => {
  const count = await strapi.admin.services.user.countUsersWithoutRole();

  if (count > 0) {
    strapi.log.warn(`Some users (${count}) don't have any role.`);
  }
};

const resetSuperAdminPermissions = async () => {
  const superAdminRole = await strapi.admin.services.role.getSuperAdmin();
  if (!superAdminRole) {
    return;
  }

  const allActions = strapi.admin.services.permission.actionProvider.getAll();
  const contentTypesActions = allActions.filter(a => a.section === 'contentTypes');

  const permissions = [];
  contentTypesActions.forEach(action => {
    _.forIn(strapi.contentTypes, contentType => {
      if (action.subjects.includes(contentType.uid)) {
        const fields = getNestedFields(contentType.attributes, '', 1);
        permissions.push({
          action: action.actionId,
          subject: contentType.uid,
          fields,
        });
      }
    });
  });

  const otherActions = allActions.filter(a => a.section !== 'contentTypes');
  otherActions.forEach(action => {
    if (action.subjects) {
      const newPerms = action.subjects.map(subject => ({ action: action.actionId, subject }));
      permissions.push(...newPerms);
    } else {
      permissions.push({ action: action.actionId });
    }
  });

  await strapi.admin.services.permission.assign(superAdminRole.id, permissions);
};

module.exports = async () => {
  registerAdminConditions();
  registerPermissionActions();
  await cleanPermissionInDatabase();
  await createRolesIfNeeded();
  await resetSuperAdminPermissions();
  await displayWarningIfNoSuperAdmin();
  await displayWarningIfUsersDontHaveRole();
};
