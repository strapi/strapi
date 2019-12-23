'use strict';

const slugify = require('@sindresorhus/slugify');

const escapeNewlines = (content = '', placeholder = '\n') => {
  return content.replace(/[\r\n]+/g, placeholder);
};

const deepTrimObject = attribute => {
  if (Array.isArray(attribute)) {
    return attribute.map(deepTrimObject);
  }

  if (typeof attribute === 'object') {
    return Object.entries(attribute).reduce((acc, [key, value]) => {
      const trimmedObject = deepTrimObject(value);

      return { ...acc, [key]: trimmedObject };
    }, {});
  }

  return typeof attribute === 'string' ? attribute.trim() : attribute;
};

/**
 * Converts a name to a slug
 * @param {string} name a name to convert
 */
const nameToSlug = name => slugify(name, { separator: '-' });

const nameToCollectionName = name => slugify(name, { separator: '_' });

module.exports = {
  escapeNewlines,
  deepTrimObject,
  nameToSlug,
  nameToCollectionName,
};
