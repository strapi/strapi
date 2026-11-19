import type { Core, Modules, Schema } from '@strapi/types';

/**
 * A custom field attribute: `type: 'customField'` and the registered custom field UID, as the
 * content-type builder validates it, then the custom field's underlying type once converted below.
 */
type CustomFieldAttribute = {
  type: 'customField' | Modules.CustomFields.CustomFieldServerOptions['type'];
  customField: string;
};

type InputAttributes = {
  [key: string]: Schema.Attribute.AnyAttribute | CustomFieldAttribute;
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
