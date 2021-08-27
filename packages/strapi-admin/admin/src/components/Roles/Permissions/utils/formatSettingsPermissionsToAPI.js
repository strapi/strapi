/**
 * Returns an array of condition names when a condition is enabled
 * @param {object} conditions
 * @config {boolean}
 */
const createConditionsArray = conditions => {
  return Object.entries(conditions)
    .filter(([, conditionValue]) => {
      return conditionValue;
    })
    .map(([conditionName]) => conditionName);
};

const createPermission = array => {
  const [actionName, { conditions }] = array;

  return {
    action: actionName,
    subject: null,
    conditions: createConditionsArray(conditions),
    properties: {},
  };
};

const createPermissionsArrayFromCategory = categoryPermissions => {
  return Object.values(categoryPermissions).reduce((acc, current) => {
    const permissions = Object.entries(current).reduce((acc1, current1) => {
      const [
        ,
        {
          properties: { enabled },
        },
      ] = current1;

      if (!enabled) {
        return acc1;
      }

      const permission = createPermission(current1);

      acc1.push(permission);

      return acc1;
    }, []);

    return [...acc, ...permissions];
  }, []);
};

const formatSettingsPermissionsToAPI = settingsPermissionsObject => {
  return Object.values(settingsPermissionsObject).reduce((acc, current) => {
    const currentCategoryPermissions = createPermissionsArrayFromCategory(current);

    return [...acc, ...currentCategoryPermissions];
  }, []);
};

export default formatSettingsPermissionsToAPI;
export { createConditionsArray, createPermission, createPermissionsArrayFromCategory };
