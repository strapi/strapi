import pluginId from './pluginId';

export const selectPermissions = state => state[`${pluginId}_rbacManager`].permissions;

export const selectCollectionTypePermissions = state =>
  state.permissionsManager.collectionTypesRelatedPermissions;
