import { createRulesEngine } from '@strapi/admin/strapi-admin';
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
 * @internal
 * @description Returns the direct parent object for a dot-separated path.
 */
const getDirectParent = (data: unknown, path: string): unknown => {
  if (!path) return undefined;
  const isNumericIndex = (value: string) => /^\d+$/.test(value);
  const segments = path.split('.');
  const parentPath = segments.slice(0, -1);
  let current: unknown = data;

  for (const segment of parentPath) {
    if (current == null) return undefined;

    if (isNumericIndex(segment)) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(segment)];
      continue;
    }

    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

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
 * they're controlled / uncontrolled. However, Boolean fields should preserve null values.
 */
const removeNullValues = (schema: PartialSchema, components: ComponentsDictionary = {}) =>
  traverseData(
    (attribute, value) => value === null && attribute.type !== 'boolean',
    () => undefined
  )(schema, components);

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
      removeNullValues(schema, components),
      prepareRelations(schema, components),
      prepareTempKeys(schema, components)
    );

    return transformations(document);
  };

type HandleOptions = {
  schema?: Schema.ContentType | Schema.Component;
  initialValues?: AnyData;
  components?: Record<string, Schema.Component>;
};

type RemovedFieldPath = string;

/**
 * @internal
 * @description Finds the initial value for a component or dynamic zone item (based on its __temp_key__ and not its index).
 * @param initialValue - The initial values object.
 * @param item - The item to find the initial value for.
 * @returns The initial value for the item.
 */
const getItemInitialValue = (initialValue: AnyData, item: AnyData) => {
  if (initialValue && Array.isArray(initialValue)) {
    const matchingInitialItem = initialValue.find(
      (initialItem) => initialItem.__temp_key__ === item.__temp_key__
    );
    if (matchingInitialItem) {
      return matchingInitialItem;
    }
  }
  return {};
};

/**
 * @internal
 * @description Collects paths of attributes that should be removed based on visibility conditions.
 * This function only evaluates conditions.visible (JSON Logic), not the visible boolean property.
 *
 * @param data - The data object to evaluate
 * @param schema - The content type schema
 * @param components - Dictionary of component schemas
 * @param path - Current path in the data structure (for nested components/dynamiczones)
 * @returns Array of field paths that should be removed
 */
const collectInvisibleAttributes = (
  data: AnyData,
  schema: Schema.ContentType | Schema.Component | undefined,
  components: Record<string, Schema.Component>,
  path: string[] = []
): RemovedFieldPath[] => {
  if (!schema?.attributes) return [];

  const rulesEngine = createRulesEngine();
  const removedPaths: RemovedFieldPath[] = [];
  const evaluatedData: AnyData = {};

  for (const [attrName, attrDef] of Object.entries(schema.attributes)) {
    const fullPath = [...path, attrName].join('.');

    // Skip fields with visible: false - they're managed by backend
    if ('visible' in attrDef && attrDef.visible === false) {
      continue;
    }

    const condition = attrDef?.conditions?.visible;
    const isVisible = condition
      ? rulesEngine.evaluate(condition, { ...data, ...evaluatedData })
      : true;

    if (!isVisible) {
      removedPaths.push(fullPath);
      continue;
    }

    // Track this field for future condition evaluations
    if (attrName in data) {
      evaluatedData[attrName] = data[attrName];
    }

    // Recursively process components
    if (attrDef.type === 'component') {
      const compSchema = components[attrDef.component];
      const value = data[attrName];

      if (attrDef.repeatable && Array.isArray(value)) {
        value.forEach((item) => {
          const nestedPaths = collectInvisibleAttributes(item, compSchema, components, [
            ...path,
            `${attrName}[${item.__temp_key__}]`,
          ]);
          removedPaths.push(...nestedPaths);
        });
      } else if (value && typeof value === 'object') {
        const nestedPaths = collectInvisibleAttributes(value, compSchema, components, [
          ...path,
          attrName,
        ]);
        removedPaths.push(...nestedPaths);
      }
    }

    // Recursively process dynamic zones
    if (attrDef.type === 'dynamiczone' && Array.isArray(data[attrName])) {
      data[attrName].forEach((dzItem: AnyData) => {
        const compUID = dzItem?.__component;
        const compSchema = components[compUID];
        const nestedPaths = collectInvisibleAttributes(dzItem, compSchema, components, [
          ...path,
          `${attrName}[${dzItem.__temp_key__}]`,
        ]);
        removedPaths.push(...nestedPaths);
      });
    }
  }

  return removedPaths;
};

/**
 * @internal
 * @description Removes attributes from data based on the list of paths to remove.
 * Preserves fields with visible: false from data or initialValues.
 *
 * @param data - The data object to filter
 * @param initialValues - Initial values to fall back to
 * @param schema - The content type schema
 * @param components - Dictionary of component schemas
 * @param removedPaths - Array of field paths to remove
 * @param currentPath - Current path in the data structure
 * @returns Filtered data object
 */
const filterDataByRemovedPaths = (
  data: AnyData,
  initialValues: AnyData,
  schema: Schema.ContentType | Schema.Component | undefined,
  components: Record<string, Schema.Component>,
  removedPaths: RemovedFieldPath[],
  currentPath: string[] = []
): AnyData => {
  if (!schema?.attributes) return data;

  const result: AnyData = {};

  for (const [attrName, attrDef] of Object.entries(schema.attributes)) {
    const fullPath = [...currentPath, attrName].join('.');

    // Check if this field should be removed
    if (removedPaths.includes(fullPath)) {
      continue;
    }

    // Handle fields with visible: false - preserve from data or initialValues
    if ('visible' in attrDef && attrDef.visible === false) {
      const userProvided = Object.hasOwn(data, attrName);
      if (userProvided) {
        result[attrName] = data[attrName];
      } else if (attrName in initialValues) {
        result[attrName] = initialValues[attrName];
      }
      continue;
    }

    const userProvided = Object.hasOwn(data, attrName);
    const currentValue = userProvided ? data[attrName] : undefined;
    const initialValue = initialValues?.[attrName];

    // Handle components
    if (attrDef.type === 'component') {
      const compSchema = components[attrDef.component];
      const value = currentValue === undefined ? initialValue : currentValue;

      if (!value) {
        result[attrName] = attrDef.repeatable ? [] : null;
        continue;
      }

      if (attrDef.repeatable && Array.isArray(value)) {
        result[attrName] = value.map((item) => {
          const componentInitialValue = getItemInitialValue(initialValue, item);
          return filterDataByRemovedPaths(
            item,
            componentInitialValue,
            compSchema,
            components,
            removedPaths,
            [...currentPath, `${attrName}[${item.__temp_key__}]`]
          );
        });
      } else {
        result[attrName] = filterDataByRemovedPaths(
          value,
          initialValue ?? {},
          compSchema,
          components,
          removedPaths,
          [...currentPath, attrName]
        );
      }

      continue;
    }

    // Handle dynamic zones
    if (attrDef.type === 'dynamiczone') {
      if (!Array.isArray(currentValue)) {
        result[attrName] = [];
        continue;
      }

      result[attrName] = currentValue.map((dzItem) => {
        const compUID = dzItem?.__component;
        const compSchema = components[compUID];
        const componentInitialValue = getItemInitialValue(initialValue, dzItem);

        const cleaned = filterDataByRemovedPaths(
          dzItem,
          componentInitialValue,
          compSchema,
          components,
          removedPaths,
          [...currentPath, `${attrName}[${dzItem.__temp_key__}]`]
        );

        // For newly created components, ensure id is undefined (in case of reordering)
        const processedItem =
          dzItem.id === undefined || dzItem.id === null
            ? { __component: compUID, ...cleaned, id: undefined }
            : { __component: compUID, ...cleaned };

        return processedItem;
      });

      continue;
    }

    // Regular fields - preserve from data or initialValues
    if (currentValue !== undefined) {
      result[attrName] = currentValue;
    } else if (initialValue !== undefined) {
      result[attrName] = initialValue;
    }
  }

  // Pass through any fields from data that aren't in the schema
  for (const [key, value] of Object.entries(data)) {
    if (!(key in result) && !(key in (schema?.attributes || {}))) {
      result[key] = value;
    }
  }

  return result;
};

/**
 * Removes values from the data object if their corresponding attribute has a
 * visibility condition that evaluates to false.
 *
 * @param data - The data object to filter based on visibility
 * @param options - Schema, initialValues, and components
 * @returns Object with filtered data and list of removed attribute paths
 */
const handleInvisibleAttributes = (
  data: AnyData,
  { schema, initialValues = {}, components = {} }: HandleOptions
): {
  data: AnyData;
  removedAttributes: RemovedFieldPath[];
} => {
  if (!schema?.attributes) return { data, removedAttributes: [] };

  const removedAttributes = collectInvisibleAttributes(data, schema, components);

  const filteredData = filterDataByRemovedPaths(
    data,
    initialValues,
    schema,
    components,
    removedAttributes
  );

  return {
    data: filteredData,
    removedAttributes,
  };
};

export {
  removeProhibitedFields,
  prepareRelations,
  prepareTempKeys,
  removeFieldsThatDontExistOnSchema,
  transformDocument,
  handleInvisibleAttributes,
  getDirectParent,
};
export type { AnyData };
