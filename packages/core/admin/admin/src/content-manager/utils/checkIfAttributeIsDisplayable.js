import { toLower } from 'lodash';

const checkIfAttributeIsDisplayable = (attribute) => {
  if (attribute.private) {
    return false;
  }

  const type = attribute.type;

  if (type === 'relation') {
    return !toLower(attribute.relationType).includes('morph');
  }

  return !['json', 'dynamiczone', 'richtext', 'password'].includes(type) && !!type;
};

export default checkIfAttributeIsDisplayable;
