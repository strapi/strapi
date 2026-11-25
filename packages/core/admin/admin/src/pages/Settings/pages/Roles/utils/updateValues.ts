import { isObject } from '../../../../../utils/objects';

/**
 * Sets all the none object values of an object to the given one
 * It preserves the shape of the object, it only modifies the leafs
 * of an object.
 * This utility is very helpful when dealing with parent<>children checkboxes
 */
const updateValues = (
  obj: object,
  valueToSet: boolean,
  isFieldUpdate = false
): Record<string, unknown> => {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (key === 'conditions' && !isFieldUpdate) {
      acc[key] = value;

      return acc;
    }

    if (isObject(value)) {
      return { ...acc, [key]: updateValues(value, valueToSet, key === 'fields') };
    }

    acc[key] = valueToSet;

    return acc;
  }, {});
};

/**
 * Permission-aware version of updateValues.
 * When permissionChecker is undefined (Role editing), behaves like updateValues.
 * When permissionChecker is provided (Admin Token editing), filters leaf updates based on permissions.
 */
const updateValuesWithPermissions = (
  obj: object,
  valueToSet: boolean,
  permissionChecker?: (path: string[]) => boolean,
  currentPath: string[] = [],
  isFieldUpdate = false
): Record<string, unknown> => {
  if (permissionChecker === undefined) {
    return updateValues(obj, valueToSet, isFieldUpdate);
  }

  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const newPath = [...currentPath, key];

    if (key === 'conditions' && !isFieldUpdate) {
      acc[key] = value;
      return acc;
    }

    if (isObject(value)) {
      return {
        ...acc,
        [key]: updateValuesWithPermissions(
          value,
          valueToSet,
          permissionChecker,
          newPath,
          key === 'fields'
        ),
      };
    }

    const hasPermission = permissionChecker(newPath);
    acc[key] = hasPermission ? valueToSet : value;

    return acc;
  }, {});
};

export { updateValues, updateValuesWithPermissions };
