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
      const currentImmutableSchemas = fromJS(currentSchema).setIn(
        ['schema', 'attributes'],
        OrderedMap(fromJS(currentAttributes))
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
    OrderedMap(fromJS(get(mainSchema, attributesPath, {})))
  );

  const immutableData = fromJS({
    components: componentsWithImmutableSchema,
    [keyName]: mainImmutableSchema,
  });

  return immutableData;
};

export default createModifiedDataSchema;
export { orderAllDataAttributesWithImmutable };
