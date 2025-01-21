type Primitive = string | number | boolean | null | undefined;

export type DeepRecord<T> = {
  [K in keyof T]: T[K] extends Primitive ? T[K] : DeepRecord<T[K]>;
};

export const recursiveRenameKeys = <T extends object>(
  obj: T,
  fn: (key: string) => string
): DeepRecord<T> =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      const getValue = (v: unknown): unknown =>
        typeof v === 'object' && v !== null ? recursiveRenameKeys(v, fn) : v;

      return [fn(key), Array.isArray(value) ? value.map((val) => getValue(val)) : getValue(value)];
    })
  ) as DeepRecord<T>;
