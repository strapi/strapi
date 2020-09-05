const contentManagerPermissionPrefix = 'plugins::content-manager.explorer';
const ATTRIBUTES_PERMISSIONS_ACTIONS = ['create', 'read', 'update'];

const staticAttributeActions = ATTRIBUTES_PERMISSIONS_ACTIONS.map(
  action => `${contentManagerPermissionPrefix}.${action}`
);

export { contentManagerPermissionPrefix, staticAttributeActions, ATTRIBUTES_PERMISSIONS_ACTIONS };
