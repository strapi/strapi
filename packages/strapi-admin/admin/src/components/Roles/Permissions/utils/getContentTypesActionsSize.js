import { get } from 'lodash';

const getContentTypesActionsSize = (contentTypes, permissions, action) => {
  const count = contentTypes.reduce((acc, current) => {
    if (get(permissions, [current.uid, 'contentTypeActions', action], false)) {
      return acc + 1;
    }

    return acc;
  }, 0);

  return count;
};

export default getContentTypesActionsSize;
