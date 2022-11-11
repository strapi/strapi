'use strict';

const bytesPerKb = 1024;
const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

const readableBytes = (bytes, decimals = 1, padStart = 0) => {
  if (!bytes) {
    return '0';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(bytesPerKb));
  const result = `${parseFloat((bytes / bytesPerKb ** i).toFixed(decimals))} ${sizes[i].padStart(
    2
  )}`;

  return result.padStart(padStart);
};

module.exports = {
  readableBytes,
};
