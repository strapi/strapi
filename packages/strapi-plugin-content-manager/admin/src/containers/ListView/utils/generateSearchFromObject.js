import { clone, set, unset } from 'lodash';

const generateSearchFromObject = params => {
  const clonedParams = clone(params);
  const _start = (clonedParams._page - 1) * parseInt(clonedParams._limit, 10);

  set(clonedParams, '_start', _start);
  unset(clonedParams, '_page');

  if (clonedParams._q === '') {
    unset(clonedParams, '_q');
  }

  const search = Object.keys(clonedParams)
    .reduce((acc, current) => {
      if (current !== 'filters') {
        acc.push(`${current}=${clonedParams[current]}`);
      } else {
        const filters = clonedParams[current].reduce((acc, curr) => {
          const key =
            curr.filter === '=' ? curr.name : `${curr.name}${curr.filter}`;
          acc.push(`${key}=${curr.value}`);

          return acc;
        }, []);

        if (filters.length > 0) {
          acc.push(filters.join('&'));
        }
      }

      return acc;
    }, [])
    .join('&');

  return search;
};

export default generateSearchFromObject;
