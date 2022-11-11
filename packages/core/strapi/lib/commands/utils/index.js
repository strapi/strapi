'use strict';

const readableBytes = (bytes, decimals = 1, padStart = undefined) => {
  if (!bytes) {
    return '0';
  }
  const bytesPerKb = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(bytesPerKb));
  const result = `${parseFloat((bytes / bytesPerKb ** i).toFixed(decimals))} ${sizes[i]}`;
  if (padStart) {
    return result.padStart(padStart);
  }
  return result;
};

module.exports = {
  readableBytes,
};
