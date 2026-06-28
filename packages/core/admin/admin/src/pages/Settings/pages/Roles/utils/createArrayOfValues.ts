import { Flat, flattenDeep } from '../../../../../utils/arrays';
import { isObject } from '../../../../../utils/objects';

const createArrayOfValues = <TData>(obj: unknown): Array<Flat<TData>> => {
  if (!isObject(obj)) {
    return [];
  }

  return flattenDeep<Flat<TData>>(
    Object.values(obj).map((value): Flat<TData> | Array<Flat<TData>> => {
      if (isObject(value)) {
        return createArrayOfValues<TData>(value);
      }

      return value as Flat<TData>;
    })
  );
};

export { createArrayOfValues };
