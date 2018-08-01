/**
 * Generate filters object from URI
 * @param  {String} search
 * @return {Object}
 */
const generateFiltersFromSearch = search => search
  .split('&')
  .filter(x => !x.includes('_limit') && !x.includes('_page') && !x.includes('_sort') && !x.includes('source') && !x.includes('_q='))
  .reduce((acc, curr) => {
    const arr = curr.split('=');
    const split = arr[0].split('_');
    const filter = split.length > 1 ? `_${split[1]}` : '=';
    acc.push({ attr: split[0], filter, value: decodeURIComponent(arr[1]) });

    return acc;
  }, []);

/**
 * Generate the search URI from filters
 * @param  {Array} filters Array of filter
 * @return {String}
 */
const generateSearchFromFilters = filters => {
  const base = filters.reduce((acc, curr, index) => {
    const separator = curr.filter === '=' ? '' : '=';
    const base = `${curr.attr}${curr.filter}${separator}${curr.value}`;
    acc = index === 0 ? base : `${acc}&${base}`;

    return acc;
  }, '');

  return filters.length > 0 ? `&${base}` : '';
};


/**
 * Generate the search URI from params
 * @param  {Object} params
 * @return {String}
 */
const generateSearchFromParams = params =>
  Object.keys(params).reduce((acc, curr, index) => {
    if (params[curr] !== '') {
      if (index === 0) {
        acc = `${curr}=${params[curr]}`;
      } else {
        acc = `${acc}&${curr}=${params[curr]}`;
      }
    }
    return acc;
  }, '');

  /**
* Generate the redirect URI when editing an entry
* @type {String}
*/
const generateRedirectURI = function ({ model, search } = {}) {
  return `?redirectUrl=/plugins/content-manager/${(model || this.getCurrentModelName()).toLowerCase()}${(search || this.generateSearch())}`;
};

export {
  generateFiltersFromSearch,
  generateSearchFromFilters,
  generateSearchFromParams,
  generateRedirectURI,
};
