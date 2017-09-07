import { isArray } from 'lodash';

function cleanData(value, key) {
  if (isArray(value)) {
    return value.map(obj => {
      if (obj[key]) {
        return obj[key];
      }

      return obj;
    });
  } else if (_.isObject(value)) {
    return value[key];
  }

  return value;
}

export default cleanData;
