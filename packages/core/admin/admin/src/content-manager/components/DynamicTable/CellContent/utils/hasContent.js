import isEmpty from 'lodash/isEmpty';

export default function hasContent(type, content, metadatas, fieldSchema) {
  if (type === 'component') {
    const {
      mainField: { name: mainFieldName },
    } = metadatas;

    // Repeatable fields show the ID as fallback, in case the mainField
    // doesn't have any content
    if (fieldSchema?.repeatable) {
      return content.length > 0;
    }

    return !isEmpty(content[mainFieldName]);
  }

  return !isEmpty(content);
}
