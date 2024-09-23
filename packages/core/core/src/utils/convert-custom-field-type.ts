import type { Core } from '@strapi/types';

type InputAttributes = {
  [key: string]: {
    type: string;
    customField?: string;
  };
};

export const convertCustomFieldType = (strapi: Core.Strapi) => {
  const allContentTypeSchemaAttributes = Object.values(strapi.contentTypes).map(
    (schema) => schema.attributes
  );

  const allComponentSchemaAttributes = Object.values(strapi.components).map(
    (schema) => schema.attributes
  );
  const allSchemasAttributes: InputAttributes[] = [
    ...allContentTypeSchemaAttributes,
    ...allComponentSchemaAttributes,
  ];

  for (const schemaAttrbutes of allSchemasAttributes) {
    for (const attribute of Object.values(schemaAttrbutes)) {
      if (attribute.type === 'customField') {
        const customField = strapi.get('custom-fields').get(attribute.customField);
        attribute.type = customField.type;
      }
    }
  }
};
