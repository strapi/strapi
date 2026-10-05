const actionDefinitions = [
  { displayName: 'Create', uid: 'roles.create', subCategory: 'roles' },
  { displayName: 'Read', uid: 'roles.read', subCategory: 'roles' },
  { displayName: 'Update', uid: 'roles.update', subCategory: 'roles' },
  { displayName: 'Delete', uid: 'roles.delete', subCategory: 'roles' },
  { displayName: 'Read', uid: 'providers.read', subCategory: 'providers' },
  { displayName: 'Edit', uid: 'providers.update', subCategory: 'providers' },
  { displayName: 'Read', uid: 'email-templates.read', subCategory: 'emailTemplates' },
  { displayName: 'Edit', uid: 'email-templates.update', subCategory: 'emailTemplates' },
  { displayName: 'Read', uid: 'advanced-settings.read', subCategory: 'advancedSettings' },
  { displayName: 'Edit', uid: 'advanced-settings.update', subCategory: 'advancedSettings' },
] as const;

export type AdminActionUID = (typeof actionDefinitions)[number]['uid'];

export default {
  actions: actionDefinitions.map((action) => ({
    section: 'plugins',
    ...action,
    pluginName: 'users-permissions',
    ...(action.uid === 'roles.read'
      ? {
          aliases: [
            {
              actionId: 'plugin::content-manager.explorer.read',
              subjects: ['plugin::users-permissions.role'],
            },
          ],
        }
      : {}),
  })),
};
