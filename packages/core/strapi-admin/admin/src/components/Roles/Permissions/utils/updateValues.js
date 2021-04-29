import { isObject } from 'lodash';

/**
 * Sets all the none object values of an object to the given one
 * @param {object} obj
 * @param {boolean} valueToSet The value we want to set
 * It preserves the shape of the object, it only modifies the leafs
 * of an object.
 * This utility is very helpful when dealing with parent<>children checkboxes
 */
const updateValues = (obj, valueToSet) => {
  return Object.keys(obj).reduce((acc, current) => {
    const currentValue = obj[current];

    if (current === 'conditions') {
      acc[current] = currentValue;

      return acc;
    }

    if (isObject(currentValue)) {
      return { ...acc, [current]: updateValues(currentValue, valueToSet) };
    }

    acc[current] = valueToSet;

    return acc;
  }, {});
};

export default updateValues;
