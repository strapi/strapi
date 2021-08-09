const getFilters = search => {
  const query = new URLSearchParams(search);
  const filters = [];

  // eslint-disable-next-line no-restricted-syntax
  for (let [key, queryValue] of query.entries()) {
    if (!['sort', 'pageSize', 'page', '_q'].includes(key)) {
      const splitted = key.split('_');
      let filterName;
      let filterType;

      // Filter type === '=')
      if (splitted.length === 1) {
        filterType = '=';
        filterName = key;
      } else {
        filterType = `_${splitted[1]}`;
        filterName = splitted[0];
      }

      const value = decodeURIComponent(queryValue);

      filters.push({ displayName: filterName, name: key, filter: filterType, value });
    }
  }

  return filters;
};

export default getFilters;
