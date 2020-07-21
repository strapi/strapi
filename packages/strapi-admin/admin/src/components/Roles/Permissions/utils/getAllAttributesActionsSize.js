import { get } from 'lodash';

const getAllAttributesActionsSize = (contentTypeUid, contentTypesPermissions) => {
  return Object.entries(get(contentTypesPermissions, [contentTypeUid, 'attributes'], {})).reduce(
    (acc, current) => {
      return acc + get(current[1], ['actions'], []).length;
    },
    0
  );
};

export default getAllAttributesActionsSize;
