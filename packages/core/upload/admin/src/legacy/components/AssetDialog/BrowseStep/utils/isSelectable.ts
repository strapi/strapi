export const isSelectable = (allowedTypes: string[], mime = '') => {
  if (!mime) return false;

  const fileType = mime.split('/')[0];

  return (
    allowedTypes.includes(fileType) ||
    (allowedTypes.includes('file') && !['video', 'image', 'audio'].includes(fileType))
  );
};
