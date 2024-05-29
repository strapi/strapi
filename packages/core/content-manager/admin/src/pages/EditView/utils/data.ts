import { generateNKeysBetween } from 'fractional-indexing';
import pipe from 'lodash/fp/pipe';

import { DOCUMENT_META_FIELDS } from '../../../constants/attributes';

import type { ComponentsDictionary, Document } from '../../../hooks/useDocument';
import type { Schema, UID } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * traverseData
 * -----------------------------------------------------------------------------------------------*/

// Make only attributes required since it's the only one Content History has
type PartialSchema = Partial<Schema.Schema> & Pick<Schema.Schema, 'attributes'>;

type Predicate = <TAttribute extends Schema.Attribute.AnyAttribute>(
  attribute: TAttribute,
  value: Schema.Attribute.Value<TAttribute>
) => boolean;
type Transform = <TAttribute extends Schema.Attribute.AnyAttribute>(
  value: any,
  attribute: TAttribute
) => any;
type AnyData = Omit<Document, 'id'>;

const BLOCK_LIST_ATTRIBUTE_KEYS = ['__component', '__temp_key__'];

/**
 * @internal This function is used to traverse the data and transform the values.
 * Given a predicate function, it will transform the value (using the given transform function)
 * if the predicate returns true. If it finds that the attribute is a component or dynamiczone,
 * it will recursively traverse those data structures as well.
 *
 * It is possible to break the ContentManager by using this function incorrectly, for example,
 * if you transform a number into a string but the attribute type is a number, the ContentManager
 * will not be able to save the data and the Form will likely crash because the component it's
 * passing the data too won't succesfully be able to handle the value.
 */
const traverseData =
  (predicate: Predicate, transform: Transform) =>
  (schema: PartialSchema, components: ComponentsDictionary = {}) =>
  (data: AnyData = {}) => {
    const traverse = (datum: AnyData, attributes: Schema.Schema['attributes']) => {
      return Object.entries(datum).reduce<AnyData>((acc, [key, value]) => {
        const attribute = attributes[key];

        /**
         * If the attribute is a block list attribute, we don't want to transform it.
         * We also don't want to transform null or undefined values.
         */
        if (BLOCK_LIST_ATTRIBUTE_KEYS.includes(key) || value === null || value === undefined) {
          acc[key] = value;
          return acc;
        }

        if (attribute.type === 'component') {
          if (attribute.repeatable) {
            const componentValue = (
              predicate(attribute, value) ? transform(value, attribute) : value
            ) as Schema.Attribute.Value<Schema.Attribute.Component<UID.Component, true>>;
            acc[key] = componentValue.map((componentData) =>
              traverse(componentData, components[attribute.component]?.attributes ?? {})
            );
          } else {
            const componentValue = (
              predicate(attribute, value) ? transform(value, attribute) : value
            ) as Schema.Attribute.Value<Schema.Attribute.Component<UID.Component, false>>;

            acc[key] = traverse(componentValue, components[attribute.component]?.attributes ?? {});
          }
        } else if (attribute.type === 'dynamiczone') {
          const dynamicZoneValue = (
            predicate(attribute, value) ? transform(value, attribute) : value
          ) as Schema.Attribute.Value<Schema.Attribute.DynamicZone>;

          acc[key] = dynamicZoneValue.map((componentData) =>
            traverse(componentData, components[componentData.__component]?.attributes ?? {})
          );
        } else if (predicate(attribute, value)) {
          acc[key] = transform(value, attribute);
        } else {
          acc[key] = value;
        }

        return acc;
      }, {});
    };

    return traverse(data, schema.attributes);
  };

/* -------------------------------------------------------------------------------------------------
 * removeProhibitedFields
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal Removes all the fields that are not allowed.
 */
const removeProhibitedFields = (prohibitedFields: Schema.Attribute.Kind[]) =>
  traverseData(
    (attribute) => prohibitedFields.includes(attribute.type),
    () => ''
  );

/* -------------------------------------------------------------------------------------------------
 * prepareRelations
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal
 * @description Sets all relation values to an empty array.
 */
const prepareRelations = traverseData(
  (attribute) => attribute.type === 'relation',
  () => ({
    connect: [],
    disconnect: [],
  })
);

/* -------------------------------------------------------------------------------------------------
 * prepareTempKeys
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal
 * @description Adds a `__temp_key__` to each component and dynamiczone item. This gives us
 * a stable identifier regardless of its ids etc. that we can then use for drag and drop.
 */
const prepareTempKeys = traverseData(
  (attribute) =>
    (attribute.type === 'component' && attribute.repeatable) || attribute.type === 'dynamiczone',
  (data) => {
    if (Array.isArray(data) && data.length > 0) {
      const keys = generateNKeysBetween(undefined, undefined, data.length);

      return data.map((datum, index) => ({
        ...datum,
        __temp_key__: keys[index],
      }));
    }

    return data;
  }
);

/* -------------------------------------------------------------------------------------------------
 * removeFieldsThatDontExistOnSchema
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal
 * @description Fields that don't exist in the schema like createdAt etc. are only on the first level (not nested),
 * as such we don't need to traverse the components to remove them.
 */
const removeFieldsThatDontExistOnSchema = (schema: PartialSchema) => (data: AnyData) => {
  const schemaKeys = Object.keys(schema.attributes);
  const dataKeys = Object.keys(data);

  const keysToRemove = dataKeys.filter((key) => !schemaKeys.includes(key));

  const revisedData = [...keysToRemove, ...DOCUMENT_META_FIELDS].reduce((acc, key) => {
    delete acc[key];

    return acc;
  }, structuredClone(data));

  return revisedData;
};

/**
 * @internal
 * @description We need to remove null fields from the data-structure because it will pass it
 * to the specific inputs breaking them as most would prefer empty strings or `undefined` if
 * they're controlled / uncontrolled.
 */
const removeNullValues = (data: AnyData) => {
  return Object.entries(data).reduce<AnyData>((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }

    acc[key] = value;

    return acc;
  }, {});
};

/* -------------------------------------------------------------------------------------------------
 * transformDocuments
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal
 * @description Takes a document data structure (this could be from the API or a default form structure)
 * and applies consistent data transformations to it. This is also used when we add new components to the
 * form to ensure the data is correctly prepared from their default state e.g. relations are set to an empty array.
 */
const transformDocument =
  (schema: PartialSchema, components: ComponentsDictionary = {}) =>
  (document: AnyData) => {
    const transformations = pipe(
      removeFieldsThatDontExistOnSchema(schema),
      removeProhibitedFields(['password'])(schema, components),
      removeNullValues,
      prepareRelations(schema, components),
      prepareTempKeys(schema, components)
    );

    return transformations(document);
  };

export {
  removeProhibitedFields,
  prepareRelations,
  prepareTempKeys,
  removeFieldsThatDontExistOnSchema,
  transformDocument,
};
