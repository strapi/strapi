import get from 'lodash/get';

const getAttributeType = (attributeName, contentType, metaData) => {
  let attributeType = get(contentType, ['attributes', attributeName, 'type'], '');

  if (attributeType === 'relation') {
    attributeType = get(metaData, [attributeName, 'list', 'mainField', 'schema', 'type'], 'string');
  }

  return attributeType === 'string' ? 'text' : attributeType;
};

export default getAttributeType;
