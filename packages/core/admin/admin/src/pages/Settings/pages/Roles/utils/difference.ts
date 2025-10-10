import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';
import transform from 'lodash/transform';

type ObjectDiff<T> = {
  [P in keyof T]?: T[P] extends Record<string, unknown> ? ObjectDiff<T[P]> : T[P];
};

function difference<T extends Record<string, unknown>>(object: T, base: T): ObjectDiff<T> {
  function changes(object: T, base: T): ObjectDiff<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return transform(object, (result, value: any, key: keyof ObjectDiff<T>) => {
      if (!isEqual(value, base[key])) {
        result[key] =
          isObject(value) && isObject(base[key]) ? changes(value as T, base[key] as T) : value;
      }
      return result;
    });
  }

  return changes(object, base);
}

export { difference };
