'use strict';

const slugify = require('@sindresorhus/slugify');

const nameToSlug = name => slugify(name, { separator: '-' });

const nameToCollectionName = name => slugify(name, { separator: '_' });

const escapeQuery = (query, charsToEscape, escapeChar = '\\') => {
  return query
    .split('')
    .reduce(
      (escapedQuery, char) =>
        charsToEscape.includes(char)
          ? `${escapedQuery}${escapeChar}${char}`
          : `${escapedQuery}${char}`,
      ''
    );
};

module.exports = {
  nameToSlug,
  nameToCollectionName,
  escapeQuery,
};
