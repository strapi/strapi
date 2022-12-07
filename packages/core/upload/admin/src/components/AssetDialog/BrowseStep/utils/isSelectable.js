/**
 * @param {string[]} allowedTypes
 * @param {string} mime
 * @returns {boolean}
 */

export const isSelectable = (allowedTypes, mime = '') => {
  if (!mime) return false;

  const fileType = mime.split('/')[0];

  return (
    allowedTypes.includes(fileType) ||
    (allowedTypes.includes('file') && !['video', 'image', 'audio'].includes(fileType))
  );
};
