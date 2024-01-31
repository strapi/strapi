export const transformFields = (fields: string[]): string[] => {
  return fields.map((field) => (field === 'id' ? 'documentId' : field));
};
