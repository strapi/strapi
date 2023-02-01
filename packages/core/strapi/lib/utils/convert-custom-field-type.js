'use strict';

const convertCustomFieldType = (strapi) => {
  const allContentTypeSchemaAttributes = Object.values(strapi.contentTypes).map(
    (schema) => schema.attributes
  );
  const allComponentSchemaAttributes = Object.values(strapi.components).map(
    (schema) => schema.attributes
  );
  const allSchemasAttributes = [...allContentTypeSchemaAttributes, ...allComponentSchemaAttributes];

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
