'use strict';

const slugify = require('@sindresorhus/slugify');

const nameToSlug = (name, options = { separator: '-' }) => slugify(name, options);

const nameToCollectionName = name => slugify(name, { separator: '_' });

const getCommonBeginning = (str1 = '', str2 = '') => {
  let common = '';
  let index = 0;
  while (index < str1.length && index < str2.length) {
    if (str1[index] === str2[index]) {
      common += str1[index];
      index += 1;
    } else {
      break;
    }
  }
  return common;
};

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

const stringIncludes = (arr, val) => arr.map(String).includes(String(val));
const stringEquals = (a, b) => String(a) === String(b);

module.exports = {
  nameToSlug,
  nameToCollectionName,
  getCommonBeginning,
  escapeQuery,
  stringIncludes,
  stringEquals,
};
