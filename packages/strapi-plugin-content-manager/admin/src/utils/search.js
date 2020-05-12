import { isEmpty, toString } from 'lodash';
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
        !x.includes('_q=') &&
        x !== ''
    )
    .reduce((acc, curr) => {
      const [name, value] = curr.split('=');
      const split = name.split('_');
      let filter = `_${split[split.length - 1]}`;

      if (
        ![
          '_ne',
          '_lt',
          '_lte',
          '_gt',
          '_gte',
          '_contains',
          '_containss',
          '_in',
          '_nin',
        ].includes(filter)
      ) {
        filter = '=';
      }
      const toSlice = filter === '=' ? split.length : split.length - 1;

      acc.push({
        name: split
          .slice(0, toSlice)
          .join('_')

          .replace('?', ''),
        filter,
        value: decodeURIComponent(value),
      });

      return acc;
    }, []);
};

const generateSearchFromFilters = filters => {
  return Object.keys(filters)
    .filter(key => !isEmpty(toString(filters[key])))
    .map(key => {
      let ret = `${key}=${filters[key]}`;

      if (key === 'filters') {
        const formattedFilters = filters[key]
          .reduce((acc, curr) => {
            const key =
              curr.filter === '=' ? curr.name : `${curr.name}${curr.filter}`;
            acc.push(`${key}=${curr.value}`);

            return acc;
          }, [])
          .join('&');
        ret = formattedFilters;
      }

      return ret;
    })
    .join('&');
};

export { generateFiltersFromSearch, generateSearchFromFilters };
