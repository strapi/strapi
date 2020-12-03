import { get } from 'lodash';
import { CONTENT_MANAGER_PREFIX } from './permissonsConstantsActions';

const getCreateActionsSizeByContentType = (contentTypeUid, contentTypesPermissions) => {
  return Object.entries(get(contentTypesPermissions, [contentTypeUid, 'attributes'], {})).reduce(
    (acc, current) => {
      return (
        acc +
        get(current[1], ['actions'], []).filter(
          action => action === `${CONTENT_MANAGER_PREFIX}.create`
        ).length
      );
    },
    0
  );
};

export default getCreateActionsSizeByContentType;
