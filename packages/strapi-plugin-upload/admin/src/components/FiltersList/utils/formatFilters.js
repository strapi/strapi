const formatFilters = filters => {
  // Check existing filters to avoid duplicata
  let existingFilters = [];
  let filtersToDisplay = [];

  filters.forEach(item => {
    const { name, filter, value } = item;
    const composedName = `${name}${filter}`;

    if (existingFilters.includes(composedName)) {
      // Mime filter - Display different wording than the received ones
      if (value === 'image' || value === 'video') {
        // Get filter index to update values
        const index = filtersToDisplay.findIndex(a => a.name === name && a.filter === filter);

        filtersToDisplay[index] = {
          name,
          filter: filter === '_ncontains' ? '_contains' : '_ncontains',
          value: 'file',
        };
      }
    } else {
      existingFilters.push(composedName);
      filtersToDisplay.push(item);
    }
  });

  return filtersToDisplay;
};

export default formatFilters;
