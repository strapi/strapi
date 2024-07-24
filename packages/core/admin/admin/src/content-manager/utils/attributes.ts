import type { Attribute } from '@strapi/types';

const checkIfAttributeIsDisplayable = (attribute: Attribute.Any) => {
  const { type } = attribute;

  if (type === 'relation') {
    return !attribute.relation.toLowerCase().includes('morph');
  }

  return !['json', 'dynamiczone', 'richtext', 'password', 'blocks'].includes(type) && !!type;
};

export { checkIfAttributeIsDisplayable };
