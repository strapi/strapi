import { get } from 'lodash';

const getNumberOfRecursivePermissionsByAction = (subject, action, attributeName, permissions) => {
  return Object.entries(get(permissions, [subject, 'attributes'], {})).reduce((acc, current) => {
    if (current[0].startsWith(attributeName) && current[1].actions.includes(action)) {
      return acc + 1;
    }

    return acc;
  }, 0);
};

export default getNumberOfRecursivePermissionsByAction;
