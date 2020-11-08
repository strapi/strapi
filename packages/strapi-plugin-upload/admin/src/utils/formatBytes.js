import byteSize from 'byte-size';

function formatBytes(receivedBytes, decimals = 0) {
  const { value, unit } = byteSize(receivedBytes * 1000, { precision: decimals });

  if (!unit) {
    return '0B';
  }

  return `${value}${unit.toUpperCase()}`;
}

export default formatBytes;
