import { get } from 'lodash';

const getFirstSortableHeader = headers => {
  const matched = headers.find(header => header.metadatas.sortable === true);

  return get(matched, 'name', 'id');
};

export default getFirstSortableHeader;
