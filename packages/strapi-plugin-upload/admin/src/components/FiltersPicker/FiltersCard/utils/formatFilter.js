const formatFilter = filterToFormat => {
  const { name, filter, value } = filterToFormat;

  if (name === 'mime' && value === 'file') {
    return {
      ...filterToFormat,
      filter: filter === '_contains' ? '_ncontains' : '_contains',
      value: ['image', 'video'],
    };
  }

  return filterToFormat;
};

export default formatFilter;
