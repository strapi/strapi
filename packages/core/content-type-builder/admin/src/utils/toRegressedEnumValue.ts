import slugify from '@sindresorhus/slugify';

export const toRegressedEnumValue = (value: string | undefined) => {
  if (!value) {
    return '';
  }
  return slugify(value, {
    decamelize: false,
    lowercase: false,
    separator: '_',
  });
};
