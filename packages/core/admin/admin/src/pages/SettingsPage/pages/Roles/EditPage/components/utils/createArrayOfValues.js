import { flattenDeep, isObject } from 'lodash';

const createArrayOfValues = obj => {
  if (!isObject(obj)) {
    return [];
  }

  return flattenDeep(
    Object.values(obj).map(value => {
      if (isObject(value)) {
        return createArrayOfValues(value);
      }

      return value;
    })
  );
};

export default createArrayOfValues;
