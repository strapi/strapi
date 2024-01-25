import type { Attribute } from '@strapi/types';

export const transformMediaAttribute = (
  attribute: Attribute.Media<Attribute.MediaKind | undefined, boolean>
) => {
  return {
    type: 'relation',
    relation: attribute.multiple === true ? 'morphMany' : 'morphOne',
    target: 'plugin::upload.file',
    morphBy: 'related',
  };
};
