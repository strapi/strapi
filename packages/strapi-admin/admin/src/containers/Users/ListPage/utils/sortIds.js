import { toString } from 'lodash';

const sortIds = (array, currentId) => {
  const hasUserId = array.findIndex(value => toString(value) === toString(currentId)) !== -1;

  if (!hasUserId) {
    return array;
  }

  const filtered = array.filter(value => toString(value) !== toString(currentId));

  filtered.push(currentId);

  return filtered;
};

export default sortIds;
