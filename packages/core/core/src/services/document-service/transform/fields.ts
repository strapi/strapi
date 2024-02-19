import { Documents, Common } from '@strapi/types';

type Fields = Documents.Params.Pick<Common.UID.Schema, 'fields'>['fields'];

export const transformFields = (fields: Fields): Fields => {
  // If  it's a string, and it doesn't contain documentId, should be an array
  // '*' => '*'
  // 'documentId' => 'documentId' , 'documentId,name' => 'documentId,name'
  // 'name' => ['name', 'documentId']
  // 'id' => 'documentId'
  if (typeof fields === 'string') {
    if (fields === '*') return fields;
    if (fields === 'documentId' || fields.startsWith('documentId,')) return fields;
    if (fields === 'id') return 'documentId';
    return [fields, 'documentId'];
  }

  // It's an array
  // [] => []
  if (!fields || fields.length === 0) {
    // If fields is empty, return it as is
    return fields;
  }

  // Map any id fields to documentId
  // ['id', 'name'] => ['documentId', 'name']
  const mappedFields = fields.map((field) => (field === 'id' ? 'documentId' : field));

  // Ensure we are always selecting the documentId
  // ['name', 'description'] => ['name', 'description', 'documentId']
  if (!mappedFields.includes('documentId')) {
    mappedFields.push('documentId');
  }

  return mappedFields;
};
