import type { Schema } from '@strapi/types';

const checkIfAttributeIsDisplayable = (attribute: Schema.Attribute.AnyAttribute) => {
  const { type } = attribute;

  if (type === 'relation') {
    return !attribute.relation.toLowerCase().includes('morph');
  }

  return !['json', 'dynamiczone', 'richtext', 'password', 'blocks'].includes(type) && !!type;
};

export { checkIfAttributeIsDisplayable };
