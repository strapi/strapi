const getFilters = search => {
  const query = new URLSearchParams(search);
  const filters = [];

  // eslint-disable-next-line no-restricted-syntax
  for (let pair of query.entries()) {
    if (!['_sort', 'pageSize', 'page', '_q'].includes(pair[0])) {
      const splitted = pair[0].split('_');
      let filterName;
      let filterType;

      // Filter type === '=')
      if (splitted.length === 1) {
        filterType = '=';
        filterName = pair[0];
      } else {
        filterType = `_${splitted[1]}`;
        filterName = splitted[0];
      }

      const value = decodeURIComponent(pair[1]);

      filters.push({ displayName: filterName, name: pair[0], filter: filterType, value });
    }
  }

  return filters;
};

export default getFilters;
