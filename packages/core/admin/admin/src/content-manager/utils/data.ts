import type { FormattedComponentLayout, FormattedContentTypeLayout } from './layouts';
import type { Attribute, Common, Schema } from '@strapi/types';

const createDefaultDataStructure = (
  attributes: Schema.Attributes,
  allComponentsSchema: Record<string, FormattedComponentLayout> = {}
) => {
  return Object.keys(attributes).reduce<Record<string, Attribute.GetValue<Attribute.Any>>>(
    (acc, current) => {
      const attribute = attributes[current] ?? {};
      const { type, required } = attribute;

      if ('default' in attribute) {
        acc[current] = attribute.default;
      }

      if (type === 'component') {
        const currentComponentSchema = allComponentsSchema[attribute.component]?.attributes ?? {};
        const currentComponentDefaultForm = createDefaultDataStructure(
          currentComponentSchema,
          allComponentsSchema
        );

        if (required === true) {
          acc[current] = attribute.repeatable === true ? [] : currentComponentDefaultForm;
        }

        if (attribute.min && attribute.repeatable === true && required) {
          acc[current] = [];

          for (let i = 0; i < attribute.min; i += 1) {
            acc[current].push(currentComponentDefaultForm);
          }
        }
      }

      if (type === 'dynamiczone') {
        if (required === true) {
          acc[current] = [];
        }
      }

      return acc;
    },
    {}
  );
};

const removePasswordFieldsFromData = <
  TSchema extends FormattedContentTypeLayout,
  TData extends { [K in keyof TSchema['attributes']]: Attribute.GetValue<TSchema['attributes'][K]> }
>(
  data: TData,
  contentTypeSchema: TSchema,
  componentSchema: Record<string, FormattedComponentLayout>
) => {
  const recursiveCleanData = <
    TSchemum extends FormattedContentTypeLayout | FormattedComponentLayout,
    TDatum extends {
      [P in keyof TSchemum['attributes']]: Attribute.GetValue<TSchemum['attributes'][P]>;
    }
  >(
    datum: TDatum,
    schema: TSchemum
  ) => {
    return Object.keys(datum).reduce<Record<string, Attribute.GetValue<Attribute.Any>>>(
      (acc, current) => {
        const attribute = schema.attributes[current];

        const value = datum[current];

        /**
         * This is really dumb, this basically keeps random metadata in the object,
         * but it's really not clear and doesn't make a lot of sense because you're
         * assuming that if there's no attribute we still want it? TODO: refactor.
         */
        if (!attribute) {
          acc[current] = value;
          return acc;
        }

        if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
          acc[current] = (value as Attribute.GetValue<Attribute.DynamicZone>).map(
            (componentValue) => {
              const subCleanedData = recursiveCleanData(
                componentValue,
                componentSchema[componentValue.__component]
              );

              return subCleanedData;
            }
          );

          return acc;
        }

        if (attribute.type === 'component') {
          if (attribute.repeatable) {
            acc[current] =
              value && Array.isArray(value)
                ? (
                    value as Attribute.GetValue<Attribute.Component<Common.UID.Component, true>>
                  ).map((compoData) => {
                    const subCleanedData = recursiveCleanData(
                      compoData,
                      componentSchema[attribute.component]
                    );

                    return subCleanedData;
                  })
                : value;
          } else {
            acc[current] = value
              ? recursiveCleanData(value, componentSchema[attribute.component])
              : value;
          }

          return acc;
        }

        if (attribute.type !== 'password') {
          acc[current] = value;
        }

        return acc;
      },
      {}
    );
  };

  return recursiveCleanData(data, contentTypeSchema);
};

export { createDefaultDataStructure, removePasswordFieldsFromData };
