export const getFileExtension = (ext?: string | null) =>
  ext && ext[0] === '.' ? ext.substring(1) : ext;
