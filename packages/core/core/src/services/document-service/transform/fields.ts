export const transformFields = (fields: string[]): string[] => {
  if (!fields || fields.length === 0 || !Array.isArray(fields)) {
    // If fields is empty, return it as is
    return fields;
  }

  // Map any id fields to documentId
  const mappedFields = fields.map((field) => (field === 'id' ? 'documentId' : field));

  // Ensure we are always selecting the documentId
  if (!mappedFields.includes('documentId')) {
    mappedFields.push('documentId');
  }

  return mappedFields;
};
