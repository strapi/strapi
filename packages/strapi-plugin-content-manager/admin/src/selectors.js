import pluginId from './pluginId';

export const selectPermissions = state => state.get(`${pluginId}_rbacManager`).permissions;

export const selectCollectionTypePermissions = state =>
  state.get('permissionsManager').collectionTypesRelatedPermissions;
