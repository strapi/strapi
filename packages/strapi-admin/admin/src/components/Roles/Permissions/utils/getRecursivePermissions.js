import { get } from 'lodash';

const getRecursivePermissions = (subject, attributeName, contentTypesPermissions) => {
  return Object.entries(get(contentTypesPermissions, [subject, 'attributes'], {})).reduce(
    (acc, current) => {
      const shouldAddActions = current[0].includes('.')
        ? current[0].startsWith(`${attributeName}.`)
        : current[0] === attributeName;

      if (shouldAddActions) {
        return acc + current[1].actions.length;
      }

      return acc;
    },
    0
  );
};

export default getRecursivePermissions;
