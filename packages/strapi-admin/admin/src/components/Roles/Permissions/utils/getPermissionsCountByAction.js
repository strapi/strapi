import { get } from 'lodash';

const getPermissionsCountByAction = (contentTypes, permissions, action) => {
  const count = contentTypes.reduce((contentTypeAcc, currentContentType) => {
    const attributeCount = Object.values(
      get(permissions, [currentContentType.uid, 'attributes'], [])
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
