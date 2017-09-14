import { isArray } from 'lodash';

function cleanData(value, key, secondKey) {
  if (isArray(value)) {
    return value.map(obj => {
      if (obj[key]) {
        return obj[key];
      }

      return obj;
    });
  } else if (_.isObject(value)) {
    return value[key] || value[secondKey];
  }

  return value;
}

export default cleanData;
