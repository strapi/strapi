import { nameToSlug } from '../../../utils/nameToSlug';

import type { UID } from '@strapi/types';

const createUid = (name: string) => {
  const modelName = nameToSlug(name);
  const uid = `api::${modelName}.${modelName}` as UID.Component;

  return uid;
};

// From `content-type-builder/services/Components/createComponentUid`
const createComponentUid = (name: string, category: string) => {
  return `${nameToSlug(category)}.${nameToSlug(name)}` as UID.Component;
};

export { createComponentUid, createUid };
