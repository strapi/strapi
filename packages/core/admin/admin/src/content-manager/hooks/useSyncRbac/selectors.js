export const selectCollectionTypePermissions = (state, collectionTypeUID) =>
  state.rbacProvider.collectionTypesRelatedPermissions[collectionTypeUID];
