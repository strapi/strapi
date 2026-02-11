import byteSize from 'byte-size';

export function formatBytes(receivedBytes: number | string, decimals = 0) {
  const realBytes = typeof receivedBytes === 'string' ? Number(receivedBytes) : receivedBytes;
  const { value, unit } = byteSize(realBytes * 1000, { precision: decimals });

  if (!unit) {
    return '0B';
  }

  return `${value}${unit.toUpperCase()}`;
}

export const getFileExtension = (ext?: string | null) =>
  ext && ext[0] === '.' ? ext.substring(1) : ext;

export const prefixFileUrlWithBackendUrl = (fileURL?: string) => {
  return !!fileURL && fileURL.startsWith('/') ? `${window.strapi.backendURL}${fileURL}` : fileURL;
};
