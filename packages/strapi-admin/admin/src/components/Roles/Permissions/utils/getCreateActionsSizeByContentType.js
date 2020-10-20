import { get } from 'lodash';
import { contentManagerPermissionPrefix } from './permissonsConstantsActions';

const getCreateActionsSizeByContentType = (contentTypeUid, contentTypesPermissions) => {
  return Object.entries(get(contentTypesPermissions, [contentTypeUid, 'attributes'], {})).reduce(
    (acc, current) => {
      return (
        acc +
        get(current[1], ['actions'], []).filter(
          action => action === `${contentManagerPermissionPrefix}.create`
        ).length
      );
    },
    0
  );
};

export default getCreateActionsSizeByContentType;
