import { get } from 'lodash';

const getAttributePermissionsSizeByContentTypeAction = (
  contentTypesPermissions,
  subject,
  action
) => {
  const permissionsOccurencesByAction = Object.values(
    get(contentTypesPermissions, [subject, 'attributes'], {})
  ).filter(attribute => {
    return get(attribute, 'actions', []).findIndex(permAction => permAction === action) !== -1;
  });

  return permissionsOccurencesByAction.length;
};

export default getAttributePermissionsSizeByContentTypeAction;
