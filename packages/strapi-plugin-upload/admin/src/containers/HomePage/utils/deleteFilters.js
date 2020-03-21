import { isEqual } from 'lodash';

const deleteFilters = (updatedFilters, filterToDelete) => {
  const { name, filter, value } = filterToDelete;

  // Send different wording to backend than the one displayed
  if (name === 'mime' && value === 'file') {
    const revertedFilter = filter === '_ncontains' ? '_contains' : '_ncontains';

    const imageFilter = {
      ...filterToDelete,
      filter: revertedFilter,
      value: 'image',
    };

    const videoFilter = {
      ...filterToDelete,
      filter: revertedFilter,
      value: 'video',
    };

    return updatedFilters.filter(item => {
      return !isEqual(item, imageFilter) && !isEqual(item, videoFilter);
    });
  }

  return updatedFilters.filter(item => {
    return !isEqual(item, filterToDelete);
  });
};

export default deleteFilters;
