import type { Schema, UID } from '@strapi/types';

const getNumberOfConditionalFields = () => {
  const contentTypes: Record<UID.ContentType, Schema.ContentType> = strapi.contentTypes;
  const components: Record<UID.Component, Schema.Component> = strapi.components;

  const countConditionalFieldsInSchema = (
    schema: Record<string, Schema.ContentType | Schema.Component>
  ) => {
    const attributes = Object.values(schema ?? {}).flatMap((model) =>
      Object.values(model.attributes ?? {})
    );
    return attributes.filter(
      (attribute) => attribute.conditions && typeof attribute.conditions === 'object'
    ).length;
  };

  const contentTypeCount = countConditionalFieldsInSchema(contentTypes);
  const componentCount = countConditionalFieldsInSchema(components);

  return contentTypeCount + componentCount;
};

export default getNumberOfConditionalFields;
