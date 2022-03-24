import isEmpty from 'lodash/isEmpty';

import isSingleRelation from './isSingleRelation';

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

  if (type === 'relation') {
    if (isSingleRelation(fieldSchema.relation)) {
      return !isEmpty(content);
    }

    return content.count > 0;
  }

  return !isEmpty(content);
}
