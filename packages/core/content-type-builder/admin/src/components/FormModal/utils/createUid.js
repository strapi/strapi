import nameToSlug from '../../../utils/nameToSlug';

const createUid = name => {
  const modelName = nameToSlug(name);
  const uid = `api::${modelName}.${modelName}`;

  return uid;
};

// From `content-type-builder/services/Components/createComponentUid`
const createComponentUid = (name, category) => {
  return `${nameToSlug(category)}.${nameToSlug(name)}`;
};

export { createComponentUid, createUid };
