export const isSelectable = (allowedTypes, fileType) =>
  allowedTypes.includes(fileType) ||
  (allowedTypes.includes('file') && !['video', 'image', 'audio'].includes(fileType));
