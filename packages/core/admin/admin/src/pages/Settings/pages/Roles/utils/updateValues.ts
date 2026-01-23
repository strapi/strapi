import { isObject } from '../../../../../utils/objects';

/**
 * Sets all the none object values of an object to the given one
 * It preserves the shape of the object, it only modifies the leafs
 * of an object.
 * This utility is very helpful when dealing with parent<>children checkboxes
 */
const updateValues = (obj: object, valueToSet: boolean, isFieldUpdate = false): object => {
  return Object.keys(obj).reduce((acc, current) => {
    const currentValue = obj[current as keyof object];

    if (current === 'conditions' && !isFieldUpdate) {
      // @ts-expect-error – TODO: type better
      acc[current] = currentValue;

      return acc;
    }

    if (isObject(currentValue)) {
      return { ...acc, [current]: updateValues(currentValue, valueToSet, current === 'fields') };
    }

    // @ts-expect-error – TODO: type better
    acc[current] = valueToSet;

    return acc;
  }, {});
};

/**
 * Permission-aware version of updateValues
 * When permissionChecker is undefined (Role editing), behaves like updateValues
 * When permissionChecker is provided (App Token editing), filters updates based on permissions
 *
 * @param obj - The object to update
 * @param valueToSet - The boolean value to set
 * @param permissionChecker - Optional function to check if a path should be updated
 * @param currentPath - Current path in the object tree (for permission checking)
 * @param isFieldUpdate - Whether we're updating fields (affects conditions handling)
 */
const updateValuesWithPermissions = (
  obj: object,
  valueToSet: boolean,
  permissionChecker?: (path: string[]) => boolean,
  currentPath: string[] = [],
  isFieldUpdate = false
): object => {
  // If no permission checker, use original updateValues logic (Role editing mode)
  if (!permissionChecker) {
    return updateValues(obj, valueToSet, isFieldUpdate);
  }

  // Permission-aware update logic (App Token editing mode)
  return Object.keys(obj).reduce((acc, current) => {
    const currentValue = obj[current as keyof object];
    const newPath = [...currentPath, current];

    // Preserve conditions (same as original updateValues)
    if (current === 'conditions' && !isFieldUpdate) {
      // @ts-expect-error – TODO: type better
      acc[current] = currentValue;
      return acc;
    }

    // Recursively handle nested objects
    if (isObject(currentValue)) {
      return {
        ...acc,
        [current]: updateValuesWithPermissions(
          currentValue,
          valueToSet,
          permissionChecker,
          newPath,
          current === 'fields'
        ),
      };
    }

    // For leaf values (booleans), check permission before updating
    const hasPermission = permissionChecker(newPath);

    // @ts-expect-error – TODO: type better
    acc[current] = hasPermission ? valueToSet : currentValue;

    return acc;
  }, {});
};

export { updateValues, updateValuesWithPermissions };
