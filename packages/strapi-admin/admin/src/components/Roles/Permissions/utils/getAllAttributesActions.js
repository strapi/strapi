import { get } from 'lodash';

const getAllAttributesActions = (contentTypeUid, contentTypesPermissions) => {
  return Object.entries(get(contentTypesPermissions, [contentTypeUid, 'attributes'], {})).reduce(
    (acc, current) => {
      return [...acc, ...get(current[1], ['actions'], [])];
    },
    []
  );
};

export default getAllAttributesActions;
