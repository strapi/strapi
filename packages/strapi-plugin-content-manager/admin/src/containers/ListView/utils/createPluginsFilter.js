const createPluginsFilter = obj =>
  Object.values(obj || {}).reduce((acc, current) => {
    return {
      ...acc,
      ...Object.keys(current).reduce((accumulator, key) => {
        accumulator[`_${key}`] = current[key];

        return accumulator;
      }, {}),
    };
  }, {});

export default createPluginsFilter;
