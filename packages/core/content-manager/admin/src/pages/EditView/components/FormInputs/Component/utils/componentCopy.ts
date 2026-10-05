import { generateNKeysBetween } from 'fractional-indexing';
import toPath from 'lodash/toPath';

import { getIn, isInteger, isObject, setIn } from '../../../../../../utils/objects';
import { type AnyData, transformDocument } from '../../../../utils/data';

import type { RelationResult } from '../../../../../../../../shared/contracts/relations';
import type { ComponentsDictionary, Document, Schema } from '../../../../../../hooks/useDocument';

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
 * Blocks of a dynamic zone carry the uid of the component they're made of.
 */
const getDynamicZoneBlockUid = (block: unknown) =>
  isObject(block) && typeof block.__component === 'string' ? block.__component : undefined;

/* -------------------------------------------------------------------------------------------------
 * cloneComponentData
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description Creates a standalone copy of a component: ids and temp keys are removed
 * (the component and the ones nested in it will be created as new ones) and the data
 * is prepared for the form, where relations start empty, see `connectRelations`.
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

/**
 * @description Describes where a field sits regardless of the position of the blocks it's nested in,
 * e.g. `dynamiczone.1.dish` becomes `dynamiczone.[default.closingperiod].dish`. Fields sharing
 * a scope can copy the same components.
 */
const getCopyScope = (fieldName: string, targetValues: unknown) => {
  const segments = toPath(fieldName);

  return segments
    .map((segment, position) => {
      if (!isInteger(segment)) {
        return segment;
      }

      const blockUid = getDynamicZoneBlockUid(getIn(targetValues, segments.slice(0, position + 1)));

      return `[${blockUid ?? ''}]`;
    })
    .join('.');
};

/* -------------------------------------------------------------------------------------------------
 * Relations
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description Lists the relations of a component of the source entry, including the ones of the
 * components nested in it. An entry only holds the count of its relations, they have to be
 * loaded to be copied.
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
      const isEmpty = isObject(value) && value.count === 0;

      // A component that was never saved has no relations to load.
      if ((typeof id !== 'number' && typeof id !== 'string') || isEmpty) {
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
  getCopyScope,
  getRelationsToCopy,
};
export type { ComponentCopyMode, ComponentInstance, RelationToCopy };
