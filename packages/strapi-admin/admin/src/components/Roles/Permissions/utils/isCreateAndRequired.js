import { contentManagerPermissionPrefix } from './permissonsConstantsActions';

const isCreateAndRequired = (attribute, action) =>
  action === `${contentManagerPermissionPrefix}.create` && attribute.required;

export default isCreateAndRequired;
