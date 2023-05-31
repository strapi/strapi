import toLower from 'lodash/toLower';

const checkIfAttributeIsDisplayable = (attribute) => {
  const type = attribute.type;

  if (type === 'relation') {
    return !toLower(attribute.relationType).includes('morph');
  }

  return !['json', 'dynamiczone', 'richtext', 'password'].includes(type) && !!type;
};

export default checkIfAttributeIsDisplayable;
