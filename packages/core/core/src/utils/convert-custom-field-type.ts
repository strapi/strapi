import type { Core } from '@strapi/types';

/**
 * The Strapi apps whose custom field attributes are converted: at the end of the register phase,
 * `convertCustomFieldType` replaced each `type: 'customField'` with the type of its registered
 * custom field. From then on, a newly registered custom field is not used for this start.
 *
 * `strapi.isLoaded` cannot tell: it stays `false` until the end of the bootstrap phase.
 */
const appsWithConvertedCustomFieldTypes = new WeakSet<Core.Strapi>();

export const areCustomFieldTypesConverted = (strapi: Core.Strapi): boolean =>
  appsWithConvertedCustomFieldTypes.has(strapi);

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

  // Custom fields registered from now on are not used for this start
  appsWithConvertedCustomFieldTypes.add(strapi);
};
