import { isArray, isObject } from 'lodash';

const cleanData = (value, key, secondKey) => {
  if (isArray(value)) {
    return value.map(obj => obj[key] ? obj[key] : obj);
  } else if (isObject(value)) {
    return value[key] || value[`_${key}`] || value[secondKey] || value[`_${secondKey}`];
  } else {
    return value;
  }
};

export default cleanData;
