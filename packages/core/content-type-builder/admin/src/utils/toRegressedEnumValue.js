import slugify from '@sindresorhus/slugify';

const toRegressedEnumValue = value =>
  slugify(value, {
    decamelize: false,
    lowercase: false,
    separator: '_',
  });

export default toRegressedEnumValue;
