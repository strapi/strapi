'use strict';

/**
 * @description
 * Sets attribute.type to customField
 * @param {object} attributes Attributes found on content-type or component
 */
const convertCustomFieldType = attributes => {
  Object.values(attributes).forEach(attribute => {
    if (attribute.customField) {
      attribute.type = 'customField';
    }
  });
};

module.exports = convertCustomFieldType;
