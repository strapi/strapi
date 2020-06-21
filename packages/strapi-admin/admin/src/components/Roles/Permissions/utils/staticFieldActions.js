import {
  ATTRIBUTES_PERMISSIONS_ACTIONS,
  contentManagerPermissionPrefix,
} from './permissonsConstantsActions';

const isAttributeAction = action => {
  return ATTRIBUTES_PERMISSIONS_ACTIONS.map(
    action => `${contentManagerPermissionPrefix}.${action}`
  ).includes(action);
};

export default isAttributeAction;
