import { fromJS, OrderedMap } from 'immutable';
import { get } from 'lodash';

const createModifiedDataSchema = (
  contentTypeSchema,
  retrievedComponents,
  allComponentsSchema,
  isInContentTypeView
) => {
  const componentsAssociatedToContentType = retrievedComponents.reduce(
    (acc, current) => {
      const componentSchema = get(allComponentsSchema, current, {});

      acc[current] = componentSchema;

      return acc;
    },
    {}
  );
  const keyName = isInContentTypeView ? 'contentType' : 'component';
  const schema = {
    [keyName]: contentTypeSchema,
    components: componentsAssociatedToContentType,
  };

  return schema;
};

const orderAllDataAttributesWithImmutable = (
  allDataSchema,
  isInContentTypeView
) => {
  const attributesPath = ['schema', 'attributes'];
  const componentsSchema = allDataSchema.components;
  const componentsWithImmutableSchema = Object.keys(componentsSchema).reduce(
    (acc, current) => {
      const currentSchema = get(componentsSchema, [current], {});

      const currentAttributes = get(currentSchema, attributesPath, {});

      const fromJSAttributes = Object.keys(currentAttributes).reduce(
        (acc, current) => {
          acc[current] = fromJS(currentAttributes[current]);

          return acc;
        },
        {}
      );

      // TODO refacto
      const currentImmutableSchemas = fromJS(currentSchema).setIn(
        ['schema', 'attributes'],
        fromJS(OrderedMap(fromJSAttributes))
      );

      acc[current] = fromJS(currentImmutableSchemas);

      return acc;
    },
    {}
  );
  const keyName = isInContentTypeView ? 'contentType' : 'component';
  const mainSchema = get(allDataSchema, [keyName], {});
  const mainImmutableSchema = fromJS(mainSchema).setIn(
    attributesPath,
    fromJS(
      OrderedMap(
        Object.keys(get(mainSchema, attributesPath, {})).reduce(
          (acc, current) => {
            acc[current] = fromJS(
              get(mainSchema, [...attributesPath, current], {})
            );

            return acc;
          },
          {}
        )
      )
    )
  );

  const immutableData = fromJS({
    components: componentsWithImmutableSchema,
    [keyName]: mainImmutableSchema,
  });

  return immutableData;
};

export default createModifiedDataSchema;
export { orderAllDataAttributesWithImmutable };
