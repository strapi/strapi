import _, { kebabCase } from 'lodash';
import { trimChars, trimCharsEnd, trimCharsStart } from 'lodash/fp';
import slugify from '@sindresorhus/slugify';

const nameToSlug = (name: string, options = { separator: '-' }) => slugify(name, options);

const nameToCollectionName = (name: string) => slugify(name, { separator: '_' });

const toRegressedEnumValue = (value: string) =>
  slugify(value, {
    decamelize: false,
    lowercase: false,
    separator: '_',
  });

const getCommonBeginning = (...strings: string[]) =>
  _.takeWhile(strings[0], (char, index) => strings.every((string) => string[index] === char)).join(
    ''
  );

const getCommonPath = (...paths: string[]) => {
  const [segments, ...otherSegments] = paths.map((it) => _.split(it, '/'));
  return _.join(
    _.takeWhile(segments, (str, index) => otherSegments.every((it) => it[index] === str)),
    '/'
  );
};

const escapeQuery = (query: string, charsToEscape: string[], escapeChar = '\\') => {
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

const stringIncludes = (arr: unknown[], val: unknown) => arr.map(String).includes(String(val));
const stringEquals = (a: unknown, b: unknown) => String(a) === String(b);
const isCamelCase = (value: string) => /^[a-z][a-zA-Z0-9]+$/.test(value);
const isKebabCase = (value: string) => /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(value);
const startsWithANumber = (value: string) => /^[0-9]/.test(value);

const joinBy = (joint: string, ...args: string[]) => {
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

const toKebabCase = (value: string) => kebabCase(value);

export {
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
