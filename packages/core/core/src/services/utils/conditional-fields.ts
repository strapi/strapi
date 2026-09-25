import { flatMap, sumBy, values } from 'lodash';
import type { Schema, UID } from '@strapi/types';

const getNumberOfConditionalFields = () => {
  const contentTypes: Record<UID.ContentType, Schema.ContentType> = strapi.contentTypes;
  const components: Record<UID.Component, Schema.Component> = strapi.components;

  const countConditionalFieldsInSchema = (
    schema: Record<string, Schema.ContentType | Schema.Component>
  ) => {
    const attributes = flatMap(schema, (model) => values(model.attributes));
    return sumBy(attributes, (attribute) =>
      attribute.conditions && typeof attribute.conditions === 'object' ? 1 : 0
    );
  };

  const contentTypeCount = countConditionalFieldsInSchema(contentTypes);
  const componentCount = countConditionalFieldsInSchema(components);

  return contentTypeCount + componentCount;
};

export default getNumberOfConditionalFields;
