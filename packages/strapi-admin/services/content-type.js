'use strict';

const _ = require('lodash');

const getNestedFields = (contentTypeUid, { fieldPath = '', nestingLevel = 3, components = {} }) => {
  if (nestingLevel === 0) {
    return fieldPath ? [fieldPath] : [];
  }
  if (!components[contentTypeUid]) {
    throw new Error(`${contentTypeUid} doesn't exist`);
  }

  return _.reduce(
    components[contentTypeUid].attributes,
    (fields, attribute, attributeName) => {
      const newFieldPath = fieldPath ? `${fieldPath}.${attributeName}` : attributeName;

      if (attribute.type !== 'component') {
        return fields.concat([newFieldPath]);
      } else {
        const componentFields = getNestedFields(components[attribute.component].uid, {
          fieldPath: newFieldPath,
          nestingLevel: nestingLevel - 1,
          components,
        });
        return fields.concat(componentFields);
      }
    },
    []
  );
};

module.exports = {
  getNestedFields,
};
