import type { Strapi } from '../Strapi';
import { Schema } from '../types';

const convertCustomFieldType = (strapi: Strapi) => {
  const allContentTypeSchemaAttributes = Object.values(strapi.contentTypes).map(
    (schema) => schema.attributes
  );

  const allComponentSchemaAttributes = Object.values(strapi.components).map(
    (schema) => schema.attributes
  );
  const allSchemasAttributes: Schema.Attributes[] = [
    ...allContentTypeSchemaAttributes,
    ...allComponentSchemaAttributes,
  ];

  for (const schemaAttrbutes of allSchemasAttributes) {
    for (const attribute of Object.values(schemaAttrbutes)) {
      if (attribute.type === 'customField') {
        const customField = strapi.container.get('custom-fields').get(attribute.customField);
        attribute.type = customField.type;
      }
    }
  }
};

export default convertCustomFieldType;
