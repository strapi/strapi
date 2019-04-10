const path = require('path');

module.exports = (fileP, useFileNameAsKey = true) => {
  const prop = path
    .normalize(fileP)
    .replace(/(.settings|.json|.js)/g, '')
    .toLowerCase()
    .split('/')
    .join('.')
    .split('.');

  return useFileNameAsKey === true ? prop : prop.slice(0, -1);
};
