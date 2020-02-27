import { isEmpty, toString } from 'lodash';

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

export default generateSearchFromFilters;
