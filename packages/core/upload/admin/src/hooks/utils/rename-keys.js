export const recursiveRenameKeys = (obj, fn) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      const getValue = v => (typeof v === 'object' && v !== null ? recursiveRenameKeys(v, fn) : v);

      return [fn(key), Array.isArray(value) ? value.map(val => getValue(val)) : getValue(value)];
    })
  );
