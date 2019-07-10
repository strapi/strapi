/**
 * Generate filters object from string
 * @param  {String} search
 * @return {Object}
 */
const generateFiltersFromSearch = search => {
  return search
    .split('&')
    .filter(
      x =>
        !x.includes('_limit') &&
        !x.includes('_page') &&
        !x.includes('_sort') &&
        !x.includes('source') &&
        !x.includes('_q=')
    )
    .reduce((acc, current) => {
      const [name, value] = current.split('=');
      acc[name] = value;

      return acc;
    }, {});
};

const generateSearchFromFilters = filters => {
  return Object.keys(filters)
    .filter(key => filters[key] !== '')
    .map(key => `${key}=${filters[key]}`)
    .join('&');
};

export { generateFiltersFromSearch, generateSearchFromFilters };
