'use strict';

const convertCustomFieldType = strapi => {
  const allSchemasAttributes = Object.values(strapi.contentTypes).map(schema => schema.attributes);
  for (const schemaAttrbutes of allSchemasAttributes) {
    for (const attribute of Object.values(schemaAttrbutes)) {
      if (attribute.type === 'customField') {
        const customField = strapi.container.get('custom-fields').get(attribute.customField);
        attribute.type = customField.type;
      }
    }
  }
};

module.exports = convertCustomFieldType;
