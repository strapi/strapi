import byteSize from 'byte-size';

export function formatBytes(receivedBytes: number | string, decimals = 0) {
  const realBytes = typeof receivedBytes === 'string' ? Number(receivedBytes) : receivedBytes;
  const { value, unit } = byteSize(realBytes * 1000, { precision: decimals });

  if (!unit) {
    return '0B';
  }

  return `${value}${unit.toUpperCase()}`;
}
