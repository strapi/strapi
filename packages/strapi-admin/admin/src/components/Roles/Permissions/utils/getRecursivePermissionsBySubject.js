import { get } from 'lodash';

const getRecursivePermissionsBySubject = (subject, contentTypesPermissions) => {
  return Object.entries(get(contentTypesPermissions, [subject, 'attributes'], {})).reduce(
    (acc, current) => {
      if (current[1].actions.length > 0) {
        return acc + current[1].actions.length;
      }

      return acc;
    },
    0
  );
};

export default getRecursivePermissionsBySubject;
