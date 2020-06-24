import { get } from 'lodash';

const getAllAttributesActionsSize = (contentTypeUid, permissions) => {
  return Object.entries(get(permissions, [contentTypeUid, 'attributes'], {})).reduce(
    (acc, current) => {
      return acc + get(current[1], ['actions'], []).length;
    },
    0
  );
};

export default getAllAttributesActionsSize;
