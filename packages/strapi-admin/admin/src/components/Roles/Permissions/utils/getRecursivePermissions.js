import { get } from 'lodash';

const getRecursivePermissions = (subject, attributeName, contentTypesPermissions) => {
  return Object.entries(get(contentTypesPermissions, [subject, 'attributes'], {})).reduce(
    (acc, current) => {
      if (current[0].startsWith(current[0].includes('.') ? `${attributeName}.` : attributeName)) {
        return acc + current[1].actions.length;
      }

      return acc;
    },
    0
  );
};

export default getRecursivePermissions;
