'use strict';

module.exports = (path) => {
  let tmpPath = path;
  if (typeof tmpPath !== 'string') throw new Error('admin.url must be a string');
  if (tmpPath === '' || tmpPath === '/') return '/';

  if (tmpPath[0] !== '/') tmpPath = `/${tmpPath}`;
  if (tmpPath[tmpPath.length - 1] !== '/') tmpPath += '/';
  return tmpPath;
};
