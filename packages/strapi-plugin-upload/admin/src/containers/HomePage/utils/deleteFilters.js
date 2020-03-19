import { isEqual } from 'lodash';

const deleteFilters = (updatedFilters, item) => {
  const filterToDelete = item;
  const { name, filter, value } = filterToDelete;

  // Display different wording than the backend
  if (name === 'mime' && value === 'file') {
    const fileFilter = {
      ...filterToDelete,
      filter: filter === '_ncontains' ? '_contains' : '_ncontains',
    };
    const imageFilter = {
      ...fileFilter,
      value: 'image',
    };

    const videoFilter = {
      ...fileFilter,
      value: 'video',
    };

    return updatedFilters.filter(a => {
      return !isEqual(a, imageFilter) && !isEqual(a, videoFilter);
    });
  }

  return updatedFilters.filter(a => {
    return !isEqual(a, filterToDelete);
  });
};

export default deleteFilters;
