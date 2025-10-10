import { nameToSlug } from '../../../utils/nameToSlug';

import type { Internal } from '@strapi/types';

const createUid = (name: string): Internal.UID.ContentType => {
  const modelName = nameToSlug(name);
  return `api::${modelName}.${modelName}`;
};

// From `content-type-builder/services/Components/createComponentUid`
const createComponentUid = (name: string, category: string): Internal.UID.Component => {
  return `${nameToSlug(category)}.${nameToSlug(name)}`;
};

export { createComponentUid, createUid };
