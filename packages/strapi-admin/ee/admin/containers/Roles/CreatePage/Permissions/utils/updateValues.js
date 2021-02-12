import { isObject } from 'lodash';

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
