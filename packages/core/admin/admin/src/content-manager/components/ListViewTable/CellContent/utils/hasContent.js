import isEmpty from 'lodash/isEmpty';
import isNumber from 'lodash/isNumber';

import isSingleRelation from './isSingleRelation';
import isFieldTypeNumber from '../../../../utils/isFieldTypeNumber';

export default function hasContent(type, content, metadatas, fieldSchema) {
  if (type === 'component') {
    const {
      mainField: { name: mainFieldName, type: mainFieldType },
    } = metadatas;

    // Repeatable fields show the ID as fallback, in case the mainField
    // doesn't have any content
    if (fieldSchema?.repeatable) {
      return content.length > 0;
    }

    const value = content?.[mainFieldName];

    // relations, media ... show the id as fallback
    if (mainFieldName === 'id' && ![undefined, null].includes(value)) {
      return true;
    }

    /* The ID field reports itself as type `integer`, which makes it
       impossible to distinguish it from other number fields.

       Biginteger fields need to be treated as strings, as `isNumber`
       doesn't deal with them.
    */
    if (
      isFieldTypeNumber(mainFieldType) &&
      mainFieldType !== 'biginteger' &&
      mainFieldName !== 'id'
    ) {
      return isNumber(value);
    }

    return !isEmpty(value);
  }

  if (type === 'relation') {
    if (isSingleRelation(fieldSchema.relation)) {
      return !isEmpty(content);
    }

    return content?.count > 0;
  }

  /* 
      Biginteger fields need to be treated as strings, as `isNumber`
      doesn't deal with them.
  */
  if (isFieldTypeNumber(type) && type !== 'biginteger') {
    return isNumber(content);
  }

  if (type === 'boolean') {
    return content !== null;
  }

  return !isEmpty(content);
}
