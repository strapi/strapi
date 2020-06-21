import { get } from 'lodash';

const getRecursivePermissions = (subject, attributeName, permissions) => {
  return Object.entries(get(permissions, [subject], {})).reduce((acc, current) => {
    if (current[0].startsWith(attributeName)) {
      return acc + current[1].actions.length;
    }

    return acc;
  }, 0);
};

export default getRecursivePermissions;
