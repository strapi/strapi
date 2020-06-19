'use strict';

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

const getFieldsForActions = (actions, nestingLevel = 3) =>
  actions.reduce((perms, action) => {
    const newPerms = [];
    action.subjects.forEach(contentTypeUid => {
      const fields = strapi.admin.services['content-type'].getNestedFields(contentTypeUid, {
        components: { ...strapi.components, ...strapi.contentTypes },
        nestingLevel,
      });
      newPerms.push({
        action: action.actionId,
        subject: contentTypeUid,
        fields,
      });
    });
    return perms.concat(newPerms);
  }, []);

const createRolesIfNeeded = async () => {
  const someRolesExist = await strapi.admin.services.role.exists();
  if (someRolesExist) {
    return;
  }

  const defaultPluginPermissions = [
    {
      action: 'plugins::upload.settings.read',
    },
    {
      action: 'plugins::upload.assets.create',
    },
    {
      action: 'plugins::upload.assets.update',
      conditions: ['admin::is-creator'],
    },
    {
      action: 'plugins::upload.assets.download',
    },
    {
      action: 'plugins::upload.assets.copy-link',
    },
  ];

  const allActions = strapi.admin.services.permission.actionProvider.getAll();
  const contentTypesActions = allActions.filter(a => a.section === 'contentTypes');

  const superAdminRole = await strapi.admin.services.role.create({
    name: 'Super Admin',
    code: 'strapi-super-admin',
    description: 'Super Admins can access and manage all features and settings.',
  });

  await strapi.admin.services.user.assignARoleToAll(superAdminRole.id);

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

  const editorPermissions = getFieldsForActions(contentTypesActions);

  const authorPermissions = editorPermissions.map(p => ({
    ...p,
    conditions: ['admin::is-creator'],
  }));

  editorPermissions.push(...defaultPluginPermissions);
  authorPermissions.push(...defaultPluginPermissions);

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

  const permissions = getFieldsForActions(contentTypesActions, 1);

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
