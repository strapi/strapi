import slugify from '@sindresorhus/slugify';

export const nameToSlug = (name: string) => slugify(name, { separator: '-' });
