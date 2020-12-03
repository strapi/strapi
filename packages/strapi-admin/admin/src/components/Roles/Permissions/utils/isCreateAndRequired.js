import { CONTENT_MANAGER_PREFIX } from './permissonsConstantsActions';

const isCreateAndRequired = (attribute, action) =>
  action === `${CONTENT_MANAGER_PREFIX}.create` && attribute.required;

export default isCreateAndRequired;
