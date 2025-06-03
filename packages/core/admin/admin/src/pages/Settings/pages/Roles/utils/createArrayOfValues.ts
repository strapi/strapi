import { Flat, flattenDeep } from '../../../../../utils/arrays';
import { isObject } from '../../../../../utils/objects';

const createArrayOfValues = <TData>(obj: unknown): Array<Flat<TData>> => {
  if (!isObject(obj)) {
    return [];
  }

  return flattenDeep(
    Object.values(obj).map((value) => {
      if (isObject(value)) {
        return createArrayOfValues(value);
      }

      return value;
    })
  );
};

export { createArrayOfValues };
