import { toLower } from 'lodash';

const checkIfAttributeIsDisplayable = attribute => {
  const { type, private: isPrivate } = attribute;

  if (isPrivate) {
    return false;
  }

  if (type === 'relation') {
    return !toLower(attribute.relationType).includes('morph');
  }

  return !['json', 'dynamiczone', 'richtext', 'password'].includes(type) && !!type;
};

export default checkIfAttributeIsDisplayable;
