import { isArray, isObject } from 'lodash';

const cleanData = (value, key, secondKey) => {
  if (isArray(value)) {
    return value.map(obj => (obj[key] ? obj[key] : obj));
  }
  if (isObject(value)) {
    return (
      value[key] ||
      value[`_${key}`] ||
      value[secondKey] ||
      value[`_${secondKey}`]
    );
  }

  return value;
};

export default cleanData;
