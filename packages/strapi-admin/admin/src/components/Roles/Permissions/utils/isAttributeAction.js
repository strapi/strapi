import { STATIC_ATTRIBUTE_ACTIONS } from './permissonsConstantsActions';

const isAttributeAction = action => STATIC_ATTRIBUTE_ACTIONS.includes(action);

export default isAttributeAction;
