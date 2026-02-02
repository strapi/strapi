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

export { updateValues };
