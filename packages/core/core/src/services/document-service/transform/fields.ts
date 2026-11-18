import type { Modules, UID } from '@strapi/types';

type Fields = Modules.Documents.Params.Pick<UID.Schema, 'fields'>['fields'];

export const transformFields = (fields: Fields): Fields => {
  // If  it's a string, and it doesn't contain documentId, should be an array
  if (typeof fields === 'string') {
    // '*' => '*'
    if (fields === '*') {
      return fields;
    }

    // '' => 'documentId'
    if (fields === '') {
      return 'documentId';
    }

    // 'name,description' => 'name,description,documentId'
    if (!fields.split(',').includes('documentId')) {
      return `${fields},documentId`;
    }
  }

  // It's not an array, ignore it
  if (!fields || !Array.isArray(fields)) {
    // If fields is empty, return it as is
    return fields;
  }

  // Ensure we are always selecting the documentId
  // ['name', 'description'] => ['name', 'description', 'documentId']
  //
  // Returns a new array rather than pushing onto the given one: it belongs to the caller's
  // query params, which they may reuse.
  if (!fields.includes('documentId')) {
    return [...fields, 'documentId'];
  }

  return fields;
};
