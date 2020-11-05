const findAppliedFilter = str => {
  let filter = '=';
  let name = str;

  const filters = [
    '_ne',
    '_lt',
    '_lte',
    '_gt',
    '_gte',
    '_contains',
    '_containss',
    '_ncontains',
    '_in',
    '_nin',
  ];

  filters.forEach(filterName => {
    const split = str.split(filterName);

    if (split[1] === '') {
      filter = filterName;
      name = split[0];
    }
  });

  return { filter, name };
};

const formatFiltersFromQuery = ({ _where }) => {
  if (!_where) {
    return [];
  }

  return _where.map(obj => {
    const [key] = Object.keys(obj);
    const { filter, name } = findAppliedFilter(key);

    const value = obj[key];

    return { name, filter, value };
  });
};

export default formatFiltersFromQuery;
export { findAppliedFilter };
