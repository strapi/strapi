'use strict';

/**
 * @param {string} name
 * @param {string=} namespace
 */
const hasNamespace = (name, namespace) => {
  if (!namespace) {
    return true;
  }

  if (namespace.endsWith('::')) {
    return name.startsWith(namespace);
  } else {
    return name.startsWith(`${namespace}.`);
  }
};

/**
 * @param {string} name
 * @param {string} namespace
 */
const addNamespace = (name, namespace) => {
  if (namespace.endsWith('::')) {
    return `${namespace}${name}`;
  } else {
    return `${namespace}.${name}`;
  }
};

/**
 * @param {string} name
 * @param {string} namespace
 */
const removeNamespace = (name, namespace) => {
  if (namespace.endsWith('::')) {
    return name.replace(namespace, '');
  } else {
    return name.replace(`${namespace}.`, '');
  }
};

module.exports = {
  addNamespace,
  removeNamespace,
  hasNamespace,
};
