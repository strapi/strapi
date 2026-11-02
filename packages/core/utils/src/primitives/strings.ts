import _, { kebabCase } from 'lodash';
import slugify from '@sindresorhus/slugify';

const nameToSlug = (name: string, options: slugify.Options = { separator: '-' }) =>
  slugify(name, options);

const nameToCollectionName = (name: string) => slugify(name, { separator: '_' });

const toRegressedEnumValue = (value: string) =>
  slugify(value, {
    decamelize: false,
    lowercase: false,
    separator: '_',
  });

const getCommonPath = (...paths: string[]) => {
  const [segments, ...otherSegments] = paths.map((it) => _.split(it, '/'));
  return _.join(
    _.takeWhile(segments, (str, index) => otherSegments.every((it) => it[index] === str)),
    '/'
  );
};

const isEqual = (a: unknown, b: unknown) => String(a) === String(b);
const isCamelCase = (value: string) => /^[a-z][a-zA-Z0-9]+$/.test(value);
const isKebabCase = (value: string) => /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(value);
const startsWithANumber = (value: string) => /^[0-9]/.test(value);

const joinBy = (joint: string, ...args: string[]) => {
  return args.reduce((url, path, index) => {
    if (args.length === 1) return path;
    if (index === 0) return _.trimEnd(path, joint);
    if (index === args.length - 1) return url + joint + _.trimStart(path, joint);
    return url + joint + _.trim(path, joint);
  }, '');
};

const toKebabCase = (value: string) => kebabCase(value);

export {
  nameToSlug,
  nameToCollectionName,
  getCommonPath,
  isEqual,
  isCamelCase,
  isKebabCase,
  toKebabCase,
  toRegressedEnumValue,
  startsWithANumber,
  joinBy,
};
