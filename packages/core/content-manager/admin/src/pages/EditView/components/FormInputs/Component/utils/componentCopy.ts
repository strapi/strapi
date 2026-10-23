import { generateNKeysBetween } from 'fractional-indexing';
import isEqual from 'lodash/isEqual';
import toPath from 'lodash/toPath';

import { getIn, isInteger, isObject, setIn } from '../../../../../../utils/objects';
import { type AnyData, transformDocument } from '../../../../utils/data';
import { createDefaultForm } from '../../../../utils/forms';

import type { RelationResult } from '../../../../../../../../shared/contracts/relations';
import type { ComponentsDictionary, Document, Schema } from '../../../../../../hooks/useDocument';
import type { Schema as StrapiSchema } from '@strapi/types';

type ComponentCopyMode = 'component' | 'dynamiczone';

interface ComponentInstance {
  /**
   * The component as it's stored on the source entry. It still has its ids,
   * they're needed to load its relations.
   */
  source: AnyData;
  label: string;
  /**
   * Label of the block holding the field, when the field is nested
   * in a repeatable component or in a dynamic zone.
   */
  parentLabel?: string;
  /**
   * Where the component sits in the source entry, e.g. `dynamiczone.2.dish.0`.
   */
  sourcePath: string;
}

interface RelationToCopy {
  /**
   * The uid & id of the component holding the relation on the source entry.
   */
  model: string;
  id: RelationResult['id'];
  targetField: string;
  /**
   * Path of the relation field from the root of the copied component.
   */
  path: string[];
}

const COMPONENT_META_KEYS = ['id', '__temp_key__'];

/**
 * The schema of a component served to the admin lists its `id` and `documentId` among its
 * attributes, they aren't content.
 */
const COMPONENT_META_ATTRIBUTES = ['id', 'documentId', '__temp_key__'];

/**
 * Blocks of a dynamic zone carry the uid of the component they're made of.
 */
const getDynamicZoneBlockUid = (block: unknown) =>
  isObject(block) && typeof block.__component === 'string' ? block.__component : undefined;

/**
 * The value of a `uid` or `unique` attribute can't be copied: it's checked against the other
 * published entries when the entry is published, and against the other rows of a repeatable
 * component. Like the entry clone, the copy leaves it blank for the user to fill in.
 */
const isUniqueAttribute = (attribute: StrapiSchema.Attribute.AnyAttribute) =>
  attribute.type === 'uid' || ('unique' in attribute && attribute.unique === true);

/* -------------------------------------------------------------------------------------------------
 * cloneComponentData
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description Creates a standalone copy of a component: ids and temp keys are removed
 * (the component and the ones nested in it will be created as new ones), `uid` and `unique`
 * values are blanked and the data is prepared for the form, where relations start empty,
 * see `connectRelations`.
 */
const cloneComponentData = (
  value: unknown,
  componentUid: string,
  components: ComponentsDictionary
): AnyData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const schema = components[componentUid];
  const cloned = structuredClone(value) as AnyData;

  const sanitize = (datum: AnyData, uid: string) => {
    const componentSchema = components[uid];

    for (const key of COMPONENT_META_KEYS) {
      delete datum[key];
    }

    if (!componentSchema) {
      return datum;
    }

    Object.entries(componentSchema.attributes).forEach(([attributeName, attribute]) => {
      const currentValue = datum[attributeName];

      if (currentValue == null) {
        return;
      }

      if (isUniqueAttribute(attribute)) {
        datum[attributeName] = null;

        return;
      }

      if (attribute.type === 'component') {
        if (attribute.repeatable && Array.isArray(currentValue)) {
          datum[attributeName] = currentValue.map((item) =>
            item && typeof item === 'object' ? sanitize(item as AnyData, attribute.component) : item
          );
        } else if (typeof currentValue === 'object' && !Array.isArray(currentValue)) {
          datum[attributeName] = sanitize(currentValue as AnyData, attribute.component);
        }
      }

      if (attribute.type === 'dynamiczone' && Array.isArray(currentValue)) {
        datum[attributeName] = currentValue.map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return item;
          }

          const dynamicComponent = item as AnyData & { __component?: string };
          const dynamicComponentUid = dynamicComponent.__component;

          if (!dynamicComponentUid) {
            return dynamicComponent;
          }

          return {
            ...sanitize(dynamicComponent, dynamicComponentUid),
            __component: dynamicComponentUid,
          };
        });
      }
    });

    return datum;
  };

  const sanitized = sanitize(cloned, componentUid);

  if (!schema) {
    return sanitized;
  }

  return transformDocument(schema, components)(sanitized);
};

/* -------------------------------------------------------------------------------------------------
 * getComponentInstances
 * -----------------------------------------------------------------------------------------------*/

const getInstanceLabel = (
  componentData: unknown,
  componentUid: string,
  index: number,
  mainField: string | undefined,
  components: ComponentsDictionary
) => {
  const fieldValue = mainField ? getIn(componentData, mainField) : undefined;

  if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim().length > 0) {
    return String(fieldValue);
  }

  const displayName = components[componentUid]?.info?.displayName ?? componentUid;

  return `${displayName} ${index + 1}`;
};

interface GetComponentInstancesArgs {
  componentUid: string;
  components: ComponentsDictionary;
  getMainField: (componentUid: string) => string | undefined;
  mode: ComponentCopyMode;
  /**
   * The schema of the content-type the entries belong to.
   */
  schema?: Schema;
  sourceDocument: Document;
  /**
   * The path of the field in the entry being edited, e.g. `dynamiczone.1.dish`
   */
  sourceFieldName: string;
  /**
   * The values of the entry being edited.
   */
  targetValues: unknown;
}

interface SourceMatch {
  value: unknown;
  path: string[];
  parentLabel?: string;
}

/**
 * @description Finds the components of the source entry that can be copied into a field.
 *
 * When the field is nested in a block of a repeatable component or of a dynamic zone, every block
 * of the same kind is searched and not only the one at the same position: blocks are freely
 * reordered from one entry to another, their position tells nothing about what they hold.
 */
const getComponentInstances = ({
  componentUid,
  components,
  getMainField,
  mode,
  schema,
  sourceDocument,
  sourceFieldName,
  targetValues,
}: GetComponentInstancesArgs): ComponentInstance[] => {
  const segments = toPath(sourceFieldName);

  let attributes: Schema['attributes'] | undefined = schema?.attributes;
  // The uid of the component the blocks of a repeatable component are made of.
  let repeatableUid: string | undefined;
  let matches: SourceMatch[] = [{ value: sourceDocument, path: [] }];

  segments.forEach((segment, position) => {
    if (isInteger(segment)) {
      const dynamicZoneUid = getDynamicZoneBlockUid(
        getIn(targetValues, segments.slice(0, position + 1))
      );
      const blockUid = dynamicZoneUid ?? repeatableUid;

      matches = matches.flatMap(({ value, path }) =>
        (Array.isArray(value) ? value : [])
          .map((block, index) => ({ block, index }))
          .filter(
            ({ block }) =>
              isObject(block) && (!dynamicZoneUid || block.__component === dynamicZoneUid)
          )
          .map(({ block, index }, blockPosition) => ({
            value: block,
            path: [...path, String(index)],
            parentLabel: blockUid
              ? getInstanceLabel(block, blockUid, blockPosition, getMainField(blockUid), components)
              : undefined,
          }))
      );

      attributes = blockUid ? components[blockUid]?.attributes : undefined;

      return;
    }

    const attribute = attributes?.[segment];

    repeatableUid = attribute?.type === 'component' ? attribute.component : undefined;
    attributes = repeatableUid ? components[repeatableUid]?.attributes : undefined;

    matches = matches.flatMap(({ value, path, parentLabel }) => {
      const nextValue = isObject(value) ? value[segment] : undefined;

      return nextValue === undefined || nextValue === null
        ? []
        : [{ value: nextValue, path: [...path, segment], parentLabel }];
    });
  });

  return matches.flatMap(({ value, path, parentLabel }) => {
    const items = Array.isArray(value)
      ? value.map((item, index) => ({ item, itemPath: [...path, String(index)] }))
      : [{ item: value, itemPath: path }];

    return (
      items
        // a dynamic zone holds different components, only the ones of the wanted kind can be copied
        .filter(
          ({ item }) =>
            isObject(item) && (mode !== 'dynamiczone' || item.__component === componentUid)
        )
        .map(({ item, itemPath }, itemPosition) => ({
          source: item as AnyData,
          label: getInstanceLabel(
            item,
            componentUid,
            itemPosition,
            getMainField(componentUid),
            components
          ),
          parentLabel,
          sourcePath: itemPath.join('.'),
        }))
    );
  });
};

/* -------------------------------------------------------------------------------------------------
 * Previews
 * -----------------------------------------------------------------------------------------------*/

/**
 * The attributes a component is summed up with before it's copied: the ones with a value that
 * reads as a single line.
 */
const PREVIEW_ATTRIBUTE_TYPES = new Set<StrapiSchema.Attribute.Kind>([
  'string',
  'text',
  'richtext',
  'email',
  'uid',
  'enumeration',
  'integer',
  'biginteger',
  'float',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'time',
]);

interface ComponentPreviewField {
  name: string;
  label: string;
  type: StrapiSchema.Attribute.Kind;
  value: unknown;
}

/**
 * @description Lists the filled scalar fields of a component, in the order of the given fields
 * (typically the edit layout of the component) or of the schema. The fields whose value isn't
 * copied (`uid`, `unique`) are left out.
 */
const getComponentPreview = (
  source: unknown,
  componentUid: string,
  components: ComponentsDictionary,
  fields?: Array<{ name: string; label: string }>
): ComponentPreviewField[] => {
  const schema = components[componentUid];

  if (!schema || !isObject(source)) {
    return [];
  }

  const previewFields =
    fields ??
    Object.keys(schema.attributes)
      .filter((name) => !COMPONENT_META_ATTRIBUTES.includes(name))
      .map((name) => ({ name, label: name }));

  return previewFields.flatMap(({ name, label }) => {
    const attribute = schema.attributes[name];
    const value = source[name];

    if (
      !attribute ||
      !PREVIEW_ATTRIBUTE_TYPES.has(attribute.type) ||
      isUniqueAttribute(attribute) ||
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return [];
    }

    return [{ name, label, type: attribute.type, value }];
  });
};

/**
 * @description Tells whether a component holds any content, i.e. whether copying into it would
 * replace something. A value still equal to the default of its attribute isn't content: a
 * component that was just added is filled with its defaults. Nested components are looked into,
 * relations count whether they're loaded (`count`) or being edited (`connect`).
 */
const isComponentBlank = (
  value: unknown,
  componentUid: string,
  components: ComponentsDictionary
): boolean => {
  if (!isObject(value)) {
    return true;
  }

  const schema = components[componentUid];

  if (!schema) {
    return Object.keys(value).every((key) => COMPONENT_META_KEYS.includes(key));
  }

  const defaults = createDefaultForm(schema, components);

  return Object.entries(schema.attributes).every(([name, attribute]) => {
    const attributeValue = value[name];

    if (
      COMPONENT_META_ATTRIBUTES.includes(name) ||
      attributeValue === undefined ||
      attributeValue === null ||
      attributeValue === '' ||
      (name in defaults && isEqual(attributeValue, defaults[name]))
    ) {
      return true;
    }

    switch (attribute.type) {
      case 'component':
        if (attribute.repeatable) {
          return (
            !Array.isArray(attributeValue) ||
            attributeValue.every((item) => isComponentBlank(item, attribute.component, components))
          );
        }

        return isComponentBlank(attributeValue, attribute.component, components);
      case 'dynamiczone':
      case 'media':
        return Array.isArray(attributeValue) && attributeValue.length === 0;
      case 'relation':
        if (Array.isArray(attributeValue)) {
          return attributeValue.length === 0;
        }

        return (
          isObject(attributeValue) &&
          (!Array.isArray(attributeValue.connect) || attributeValue.connect.length === 0) &&
          (attributeValue.count === undefined || attributeValue.count === 0)
        );
      case 'boolean':
        return attributeValue === false;
      default:
        if (Array.isArray(attributeValue)) {
          return attributeValue.length === 0;
        }

        return isObject(attributeValue) && Object.keys(attributeValue).length === 0;
    }
  });
};

/* -------------------------------------------------------------------------------------------------
 * Relations
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description Lists the relations of a component of the source entry, including the ones of the
 * components nested in it. An entry only holds the count of its relations, they have to be
 * loaded to be copied. Relation fields the user isn't allowed to read aren't part of the entry
 * and are left out.
 */
const getRelationsToCopy = (
  source: unknown,
  componentUid: string,
  components: ComponentsDictionary,
  path: string[] = []
): RelationToCopy[] => {
  const schema = components[componentUid];

  if (!schema || !isObject(source)) {
    return [];
  }

  const { id } = source;

  return Object.entries(schema.attributes).flatMap(([name, attribute]) => {
    const value = source[name];

    if (attribute.type === 'relation') {
      // Only what came back with the source can be copied: a relation field the user isn't
      // allowed to read is left out of the entry. A component that was never saved has no
      // relations to load either.
      const hasRelations = isObject(value) && value.count !== 0;

      if ((typeof id !== 'number' && typeof id !== 'string') || !hasRelations) {
        return [];
      }

      return [{ model: componentUid, id, targetField: name, path: [...path, name] }];
    }

    if (attribute.type === 'component') {
      if (attribute.repeatable) {
        return (Array.isArray(value) ? value : []).flatMap((item, index) =>
          getRelationsToCopy(item, attribute.component, components, [...path, name, String(index)])
        );
      }

      return getRelationsToCopy(value, attribute.component, components, [...path, name]);
    }

    return [];
  });
};

/**
 * @description Connects relations loaded from the source entry to the relation field at `path`
 * of a copied component, in the shape the relations input works with.
 */
const connectRelations = (data: AnyData, path: string[], relations: RelationResult[]): AnyData => {
  const keys = generateNKeysBetween(null, null, relations.length);

  return setIn(
    data,
    [...path, 'connect'].join('.'),
    relations.map((relation, index) => ({
      ...relation,
      // This is what's sent to the API when the entry is saved.
      apiData: {
        id: relation.id,
        documentId: relation.documentId,
        locale: relation.locale,
      },
      __temp_key__: keys[index],
    }))
  );
};

export {
  cloneComponentData,
  connectRelations,
  getComponentInstances,
  getComponentPreview,
  getRelationsToCopy,
  isComponentBlank,
};
export type { ComponentCopyMode, ComponentInstance, ComponentPreviewField, RelationToCopy };
