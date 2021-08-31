import get from 'lodash/get';

const formatAttribute = (attributeName, metaData) => {
  const mainField = get(metaData, [attributeName, 'list', 'mainField', 'name']);

  if (mainField) {
    return `${attributeName}.${mainField}`;
  }

  return attributeName;
};

export default formatAttribute;
