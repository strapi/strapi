import type { Schema } from '@strapi/types';

type Data = Record<keyof Schema.ContentType['attributes'], any>;

const cleanData = (
  data: Data,
  schema: Schema.ContentType,
  components: Record<string, Schema.Component>
) => {
  const cleanedData = removeFields(data, [
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    'id',
    'documentId',
    'publishedAt',
    'strapi_stage',
    'strapi_assignee',
    'locale',
    'status',
  ]);

  const cleanedDataWithoutPasswordAndRelation = recursiveRemoveFieldTypes(
    cleanedData,
    schema,
    components,
    ['relation', 'password']
  );

  return cleanedDataWithoutPasswordAndRelation;
};

const removeFields = (data: Data, fields: Array<keyof Schema.ContentType['attributes']>) => {
  return Object.keys(data).reduce((acc, current) => {
    if (fields.includes(current)) {
      return acc;
    }
    acc[current] = data[current];
    return acc;
  }, {} as Data);
};

const recursiveRemoveFieldTypes = (
  data: Data,
  schema: Schema.Schema,
  components: Record<string, Schema.Component>,
  fields: Array<keyof Schema.ContentType['attributes']>
) => {
  return Object.keys(data).reduce((acc, current) => {
    const attribute = schema.attributes[current] ?? { type: undefined };

    if (fields.includes(attribute.type)) {
      return acc;
    }

    if (attribute.type === 'dynamiczone') {
      acc[current] = data[current].map((componentValue: any, index: number) => {
        const { id: _, ...rest } = recursiveRemoveFieldTypes(
          componentValue,
          components[componentValue.__component],
          components,
          fields
        );

        return {
          ...rest,
          __temp_key__: index + 1,
        };
      });
    } else if (attribute.type === 'component') {
      const { repeatable, component } = attribute;

      if (repeatable) {
        acc[current] = (data[current] ?? []).map((compoData: any, index: number) => {
          const { id: _, ...rest } = recursiveRemoveFieldTypes(
            compoData,
            components[component],
            components,
            fields
          );

          return {
            ...rest,
            __temp_key__: index + 1,
          };
        });
      } else {
        const { id: _, ...rest } = recursiveRemoveFieldTypes(
          data[current] ?? {},
          components[component],
          components,
          fields
        );

        acc[current] = rest;
      }
    } else {
      acc[current] = data[current];
    }

    return acc;
  }, {} as any);
};

export { cleanData };
