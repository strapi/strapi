import { get } from 'lodash';

const getAttributePermissionsSizeByContentTypeAction = (permissions, subject, action) => {
  const permissionsOccurencesByAction = Object.values(get(permissions, [subject], {})).filter(
    attribute => {
      return get(attribute, 'actions', []).findIndex(permAction => permAction === action) !== -1;
    }
  );

  return permissionsOccurencesByAction.length;
};

export default getAttributePermissionsSizeByContentTypeAction;
