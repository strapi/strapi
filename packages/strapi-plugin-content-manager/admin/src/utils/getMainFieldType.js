import { get } from 'lodash';

const getMainFieldType = (editRelations, relationName) => {
  const relationSchema = editRelations.find(relation => relation.name === relationName);

  return get(relationSchema, ['metadatas', 'mainFieldSchema', 'type'], null);
};

export default getMainFieldType;
