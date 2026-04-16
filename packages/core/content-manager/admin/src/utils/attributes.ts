import type { ComponentsDictionary, Schema } from '../hooks/useDocument';
import type { Schema as SchemaUtils } from '@strapi/types';

const checkIfAttributeIsDisplayable = (attribute: SchemaUtils.Attribute.AnyAttribute) => {
  const { type } = attribute;

  if (type === 'relation') {
    return !attribute.relation.toLowerCase().includes('morph');
  }

  return !['json', 'dynamiczone', 'richtext', 'password', 'blocks'].includes(type) && !!type;
};

interface MainField {
  name: string;
  type: SchemaUtils.Attribute.Kind | 'custom';
}

/**
 * @internal
 * @description given an attribute, content-type schemas & component schemas, find the mainField name & type.
 * If the attribute does not need a `mainField` then we return undefined. If we do not find the type
 * of the field, we assume it's a string #sensible-defaults
 */
const getMainField = (
  attribute: SchemaUtils.Attribute.AnyAttribute,
  mainFieldName: string | undefined,
  { schemas, components }: { schemas: Schema[]; components: ComponentsDictionary }
): MainField | undefined => {
  if (!mainFieldName) {
    return undefined;
  }

  const mainFieldType =
    attribute.type === 'component'
      ? components[attribute.component].attributes[mainFieldName].type
      : // @ts-expect-error – `targetModel` does exist on the attribute for a relation.
        schemas.find((schema) => schema.uid === attribute.targetModel)?.attributes[mainFieldName]
          .type;

  return {
    name: mainFieldName,
    type: mainFieldType ?? 'string',
  };
};

interface MediaField {
  name: string;
}

/**
 * @internal
 * @description given an attribute and a mediaField name, verify the target schema has a matching media attribute.
 */
const getMediaField = (
  attribute: SchemaUtils.Attribute.AnyAttribute,
  mediaFieldName: string | undefined,
  { schemas, components }: { schemas: Schema[]; components: ComponentsDictionary }
): MediaField | undefined => {
  if (!mediaFieldName) {
    return undefined;
  }

  const targetAttributes =
    attribute.type === 'component'
      ? components[attribute.component]?.attributes
      : // @ts-expect-error – `targetModel` does exist on the attribute for a relation.
        schemas.find((schema) => schema.uid === attribute.targetModel)?.attributes;

  if (!targetAttributes?.[mediaFieldName] || targetAttributes[mediaFieldName].type !== 'media') {
    return undefined;
  }

  return { name: mediaFieldName };
};

export { checkIfAttributeIsDisplayable, getMainField, getMediaField };
export type { MainField, MediaField };
