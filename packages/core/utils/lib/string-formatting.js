'use strict';

const _ = require('lodash');
const { trimChars, trimCharsEnd, trimCharsStart } = require('lodash/fp');
const slugify = require('@sindresorhus/slugify');
const { kebabCase } = require('lodash');

const nameToSlug = (name, options = { separator: '-' }) => slugify(name, options);

const nameToCollectionName = (name) => slugify(name, { separator: '_' });

const toRegressedEnumValue = (value) =>
  slugify(value, {
    decamelize: false,
    lowercase: false,
    separator: '_',
  });

const getCommonBeginning = (...strings) =>
  _.takeWhile(strings[0], (char, index) => strings.every((string) => string[index] === char)).join(
    ''
  );

const getCommonPath = (...paths) => {
  const [segments, ...otherSegments] = paths.map((it) => _.split(it, '/'));
  return _.join(
    _.takeWhile(segments, (str, index) => otherSegments.every((it) => it[index] === str)),
    '/'
  );
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
const isCamelCase = (value) => /^[a-z][a-zA-Z0-9]+$/.test(value);
const isKebabCase = (value) => /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(value);
const startsWithANumber = (value) => /^[0-9]/.test(value);

const joinBy = (joint, ...args) => {
  const trim = trimChars(joint);
  const trimEnd = trimCharsEnd(joint);
  const trimStart = trimCharsStart(joint);

  return args.reduce((url, path, index) => {
    if (args.length === 1) return path;
    if (index === 0) return trimEnd(path);
    if (index === args.length - 1) return url + joint + trimStart(path);
    return url + joint + trim(path);
  }, '');
};

const toKebabCase = (value) => kebabCase(value);

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
  toKebabCase,
  toRegressedEnumValue,
  startsWithANumber,
  joinBy,
};
