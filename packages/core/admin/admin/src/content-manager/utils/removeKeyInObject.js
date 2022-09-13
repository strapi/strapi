const removeKeyInObject = (obj, keyToRemove) => {
  if (!obj) {
    return obj;
  }

  return Object.keys(obj).reduce((acc, current) => {
    const value = acc[current];

    if (value === null) {
      return acc;
    }

    if (Array.isArray(value)) {
      if (Array.isArray(acc)) {
        acc[current] = removeKeyInObject(value, keyToRemove);

        return acc;
      }

      return { ...acc, [current]: value.map((obj) => removeKeyInObject(obj, keyToRemove)) };
    }

    if (typeof value === 'object') {
      if (Array.isArray(acc)) {
        acc[current] = removeKeyInObject(value, keyToRemove);

        return acc;
      }

      return { ...acc, [current]: removeKeyInObject(value, keyToRemove) };
    }

    if (current === keyToRemove) {
      delete acc[current];
    }

    return acc;
  }, obj);
};

export default removeKeyInObject;
