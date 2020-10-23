const checkIfAttributeIsDisplayable = attribute => {
  const type = attribute.type;

  if (type === 'relation') {
    return !attribute.relationType.includes('morph');
  }

  return !['json', 'component', 'richtext'].includes(type) && !!type;
};

export default checkIfAttributeIsDisplayable;
