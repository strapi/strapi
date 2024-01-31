export const transformSort = (sort: string[] | string): string[] | string => {
  if (Array.isArray(sort)) {
    return sort.map((item) => (item === 'id' ? 'documentId' : item));
  }
  return sort.replace('id', 'documentId');
};
