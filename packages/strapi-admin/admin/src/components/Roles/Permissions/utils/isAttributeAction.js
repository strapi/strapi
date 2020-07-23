import { ATTRIBUTES_PERMISSIONS_ACTIONS } from './permissonsConstantsActions';

const isAttributeAction = action =>
  ATTRIBUTES_PERMISSIONS_ACTIONS.includes(action.split('.')[action.split('.').length - 1]);

export default isAttributeAction;
