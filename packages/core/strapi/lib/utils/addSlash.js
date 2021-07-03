'use strict';

module.exports = path => {
  if (typeof path !== 'string') throw new Error('admin.url must be a string');
  if (path === '' || path === '/') return '/';

  if (path[0] != '/') path = '/' + path;
  if (path[path.length - 1] != '/') path = path + '/';
  return path;
};
