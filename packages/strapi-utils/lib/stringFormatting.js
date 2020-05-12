'use strict';

const slugify = require('@sindresorhus/slugify');

const nameToSlug = name => slugify(name, { separator: '-' });

const nameToCollectionName = name => slugify(name, { separator: '_' });

module.exports = {
  nameToSlug,
  nameToCollectionName,
};
