import slugify from '@sindresorhus/slugify';

const toGraphQLName = value =>
  slugify(value, {
    decamelize: false,
    lowercase: false,
    separator: '_',
  });

export default toGraphQLName;
