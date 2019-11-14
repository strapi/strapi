import slugify from '@sindresorhus/slugify';

const nameToSlug = name => slugify(name, { separator: '-' });

const createUid = name => {
  const modelName = nameToSlug(name);
  const uid = `application::${modelName}.${modelName}`;

  return uid;
};

export { createUid, nameToSlug };
