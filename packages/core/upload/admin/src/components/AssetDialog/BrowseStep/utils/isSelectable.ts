import { resolveFileMime } from '../../../../utils/resolveFileMime';

export const isSelectable = (allowedTypes: string[], mime = '', filename = '') => {
  const resolvedMime = resolveFileMime(mime, filename);
  if (!resolvedMime) return false;

  const fileType = resolvedMime.split('/')[0];

  return (
    allowedTypes.includes(fileType) ||
    (allowedTypes.includes('file') && !['video', 'image', 'audio'].includes(fileType))
  );
};
