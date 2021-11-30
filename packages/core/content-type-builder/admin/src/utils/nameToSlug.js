import slugify from '@sindresorhus/slugify';

const nameToSlug = name => slugify(name, { separator: '-' });

export default nameToSlug;
