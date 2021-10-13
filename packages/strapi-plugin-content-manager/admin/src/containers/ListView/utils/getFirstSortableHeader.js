import { get } from 'lodash';

const getFirstSortableHeader = headers => {
  const matched = headers.find(header => header.metadatas.sortable === true);
  const fieldName = get(matched, 'name', 'id');

  if (get(matched, 'fieldSchema.type', '') === 'relation') {
    return `${fieldName}.${matched.metadatas.mainField}`;
  }

  return fieldName;
};

export default getFirstSortableHeader;
