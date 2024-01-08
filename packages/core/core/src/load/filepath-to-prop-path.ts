import _ from 'lodash';

/**
 * Returns a path (as an array) from a file path
 */
export default (filePath: string, useFileNameAsKey = true) => {
  const cleanPath = filePath.startsWith('./') ? filePath.slice(2) : filePath;

  const prop = cleanPath
    .replace(/(\.settings|\.json|\.js)/g, '')
    .toLowerCase()
    .split('/')
    .map((p) => _.trimStart(p, '.'))
    .join('.')
    .split('.');

  return useFileNameAsKey === true ? prop : prop.slice(0, -1);
};
