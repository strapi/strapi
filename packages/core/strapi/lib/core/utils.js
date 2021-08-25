'use strict';

const addNamespace = (name, namespace) => {
  if (namespace.endsWith('::')) {
    return `${namespace}${name}`;
  } else {
    return `${namespace}.${name}`;
  }
};

module.exports = {
  addNamespace,
};
