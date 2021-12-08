export const selectPermissions = state => state['content-manager_rbacManager'].permissions;

export const selectCollectionTypePermissions = state =>
  state.rbacProvider.collectionTypesRelatedPermissions;
