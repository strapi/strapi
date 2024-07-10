import byteSize from 'byte-size';

// based on Upload plugin utils
export function formatBytes(receivedBytes: number, decimals = 0) {
  const { value, unit } = byteSize(receivedBytes * 1000, { precision: decimals });

  if (!unit) {
    return '0B';
  }

  return `${value}${unit.toUpperCase()}`;
}
