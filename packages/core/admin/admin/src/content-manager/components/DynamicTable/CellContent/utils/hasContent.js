import isEmpty from 'lodash/isEmpty';

export default function hasContent(type, content, metadatas, fieldSchema) {
  if (type === 'component') {
    const {
      mainField: { name: mainFieldName },
    } = metadatas;

    if (fieldSchema?.repeatable) {
      return content.some(item => !isEmpty(item));
    }

    return !isEmpty(content[mainFieldName]);
  }

  return !isEmpty(content);
}
