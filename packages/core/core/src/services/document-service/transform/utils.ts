/**
 * Replace the documentId field with id
 */
export const switchIdForDocumentId = (output: Record<string, any>) => {
  // Mutating for performance reasons
  const documentId = output.documentId;
  delete output.documentId;
  output.id = documentId;
  return output;
};

/**
 * Replace the id field for documentId
 */
export const switchDocumentIdForId = (output: Record<string, any>) => {
  // Mutating for performance reasons
  const id = output.id;
  delete output.id;
  output.documentId = id;
  return output;
};
