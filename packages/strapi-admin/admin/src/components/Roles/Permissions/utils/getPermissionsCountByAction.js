import { get } from 'lodash';

const getPermissionsCountByAction = (contentTypes, contentTypesPermissions, action) => {
  const count = contentTypes.reduce((contentTypeAcc, currentContentType) => {
    const attributeCount = Object.values(
      get(contentTypesPermissions, [currentContentType.uid, 'attributes'], [])
    ).reduce((attributeAcc, currentAttribute) => {
      return (
        attributeAcc +
        get(currentAttribute, 'actions', []).filter(permAction => permAction === action).length
      );
    }, 0);

    return contentTypeAcc + attributeCount;
  }, 0);

  return count;
};

export default getPermissionsCountByAction;
