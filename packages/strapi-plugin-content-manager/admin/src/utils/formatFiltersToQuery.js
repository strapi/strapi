const formatFiltersToQuery = array => {
  const nextFilters = array.map(({ name, filter, value }) => {
    if (filter === '=') {
      return { [name]: value };
    }

    return { [`${name}${filter}`]: value };
  });

  return { _where: nextFilters };
};

export default formatFiltersToQuery;
