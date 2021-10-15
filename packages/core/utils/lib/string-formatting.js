'use strict';
const _ = require('lodash');
const slugify = require('@sindresorhus/slugify');

/**
 * @param {string} name
 * @param {slugify.Options=} options
 */
const nameToSlug = (name, options = { separator: '-' }) => slugify(name, options);

/**
 * @param {string} name
 */
const nameToCollectionName = name => slugify(name, { separator: '_' });

/**
 * @param {string[]} strings
 */
const getCommonBeginning = (...strings) =>
  _.takeWhile(strings[0], (char, index) => strings.every(string => string[index] === char)).join(
    ''
  );

/**
 * @param {string[]} paths
 */
const getCommonPath = (...paths) => {
  const [segments, ...otherSegments] = paths.map(it => _.split(it, '/'));
  return _.join(
    _.takeWhile(segments, (str, index) => otherSegments.every(it => it[index] === str)),
    '/'
  );
};

/**
 * @param {string} query
 * @param {string[]} charsToEscape
 * @param {string=} escapeChar
 */
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

/**
 * @param {string[]} arr
 * @param {string} val
 */
const stringIncludes = (arr, val) => arr.map(String).includes(String(val));

/**
 * @param {string} a
 * @param {string} b
 */
const stringEquals = (a, b) => String(a) === String(b);
/**
 * @param {string=} value
 */
const isCamelCase = value => Boolean(value && /^[a-z][a-zA-Z0-9]+$/.test(value));
/**
 * @param {string=} value
 */
const isKebabCase = value => Boolean(value && /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(value));

module.exports = {
  nameToSlug,
  nameToCollectionName,
  getCommonBeginning,
  getCommonPath,
  escapeQuery,
  stringIncludes,
  stringEquals,
  isCamelCase,
  isKebabCase,
};
