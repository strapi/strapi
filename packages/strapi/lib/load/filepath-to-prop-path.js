const path = require('path');
const _ = require('lodash');

module.exports = (fileP, useFileNameAsKey = true) => {
  const prop = path
    .normalize(fileP)
    .replace(/(\.settings|\.json|\.js)/g, '')
    .toLowerCase()
    .split('/')
    .map(p => _.trimStart(p, '.'))
    .join('.')
    .split('.');

  return useFileNameAsKey === true ? prop : prop.slice(0, -1);
};
