const checkIfAttributeIsDisplayable = (attribute) => {
  const { type } = attribute;

  if (type === 'relation') {
    return !(attribute?.relationType ?? '').toLowerCase().includes('morph');
  }

  return !['json', 'dynamiczone', 'richtext', 'password'].includes(type) && !!type;
};

export default checkIfAttributeIsDisplayable;
