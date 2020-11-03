const removeKeyInObject = (obj, keyToRemove) => {
  return Object.keys(obj).reduce((acc, current) => {
    const value = acc[current];

    if (value === null) {
      return acc;
    }

    if (Array.isArray(value)) {
      return { ...acc, [current]: value.map(obj => removeKeyInObject(obj, keyToRemove)) };
    }

    if (typeof acc[current] === 'object') {
      return { ...acc, [current]: removeKeyInObject(value, keyToRemove) };
    }

    if (current === keyToRemove) {
      delete acc[current];
    }

    return acc;
  }, obj);
};

export default removeKeyInObject;
