const formatFilter = filterToFormat => {
  const { name, filter, value } = filterToFormat;

  if (name === 'mime' && value === 'file') {
    if (filter === '_contains') {
      return {
        ...filterToFormat,
        filter: '_ncontains',
        value: ['image', 'video'],
      };
    }

    return {
      ...filterToFormat,
      filter: '_contains',
      value: ['image', 'video'],
    };
  }

  return filterToFormat;
};

export default formatFilter;
