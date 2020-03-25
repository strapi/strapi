import { isEqual } from 'lodash';

const deleteFilters = (updatedFilters, filterToDelete) => {
  return updatedFilters.filter(item => !isEqual(item, filterToDelete));
};

export default deleteFilters;
