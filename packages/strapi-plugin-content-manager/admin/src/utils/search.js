import { isEmpty } from 'lodash';
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
    .reduce((acc, curr) => {
      const [name, value] = curr.split('=');
      const split = name.split('_');
      const filter = split.length > 1 ? `_${split[1]}` : '=';

      acc.push({
        name: split[0].replace('?', ''),
        filter,
        value: decodeURIComponent(value),
      });

      return acc;
    }, []);
};

const generateSearchFromFilters = filters => {
  return Object.keys(filters)
    .filter(key => !isEmpty(filters[key]))
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
