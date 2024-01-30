export const switchIdForDocumentId = (output: Record<string, any>) => {
  // Mutating for performance reasons
  const documentId = output.documentId;
  delete output.documentId;
  output.id = documentId;
  return output;
};

export const transformFields = (fields: string[]): string[] => {
  return fields.map((field) => (field === 'id' ? 'documentId' : field));
};

// TODO: the nested keys need to be keys for relations
export const transformFiltersOrPopulate = (obj: Record<string, any>): Record<string, any> => {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      obj[key] = transformFiltersOrPopulate(obj[key]);
    } else if (obj[key] === 'id') {
      obj[key] = 'documentId';
    }
    if (key === 'id') {
      obj.documentId = obj[key];
      delete obj.id;
    }
  }

  return obj;
};

export const transformSort = (sort: string[] | string): string[] | string => {
  if (Array.isArray(sort)) {
    return sort.map((item) => (item === 'id' ? 'documentId' : item));
  }
  return sort.replace('id', 'documentId');
};
