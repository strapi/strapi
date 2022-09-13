const createPluginsFilter = (obj) =>
  Object.values(obj || {}).reduce((acc, current) => Object.assign(acc, current), {});

export default createPluginsFilter;
