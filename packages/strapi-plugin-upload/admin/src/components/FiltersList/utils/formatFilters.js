const formatFilters = filters => {
  // Check existing filters to remove duplicata
  let existingFilters = [];
  let filtersToDisplay = [];

  filters.forEach(item => {
    const { name, filter, value } = item;
    const composedName = `${name}${filter}`;

    if (existingFilters.includes(composedName)) {
      // Get filter index to update
      const filterIndex = filtersToDisplay.findIndex(a => a.name === name && a.filter === filter);

      // Display different wording than the backend
      if (value === 'image' || value === 'video') {
        const filterToDisplay = filter === '_ncontains' ? '_contains' : '_ncontains';
        const filterObject = {
          name,
          filter: filterToDisplay,
          value: 'file',
        };

        filtersToDisplay[filterIndex] = filterObject;
      }
    } else {
      existingFilters.push(composedName);
      filtersToDisplay.push(item);
    }
  });

  return filtersToDisplay;
};

export default formatFilters;
