import { isNil, isPlainObject } from 'lodash/fp';
import type { UID, Struct } from '@strapi/types';

type TransformedEntry = {
  id: string;
  meta?: Record<string, unknown>;
} & Record<string, unknown>;

type TransformedComponent = {
  id: string;
  [key: string]: unknown;
};

type Entry = {
  id: string;
  [key: string]: Entry | Entry[] | string | number | null | boolean | Date;
};

function isEntry(property: unknown): property is Entry | Entry[] {
  return property === null || isPlainObject(property) || Array.isArray(property);
}

function isDZEntries(property: unknown): property is (Entry & { __component: UID.Component })[] {
  return Array.isArray(property);
}

const transformResponse = (
  resource: any,
  meta: unknown = {},
  opts: { contentType?: Struct.Schema } = {}
) => {
  if (isNil(resource)) {
    return resource;
  }

  return {
    data: transformEntry(resource, opts?.contentType),
    meta,
  };
};

function transformComponent<T extends Entry | Entry[] | null>(
  data: T,
  component: Struct.ComponentSchema
): T extends Entry[] ? TransformedComponent[] : T extends Entry ? TransformedComponent : null;
function transformComponent(
  data: Entry | Entry[] | null,
  component: Struct.ComponentSchema
): TransformedComponent | TransformedComponent[] | null {
  if (Array.isArray(data)) {
    return data.map((datum) => transformComponent(datum, component));
  }

  return transformEntry(data, component);
}

function transformEntry<T extends Entry | Entry[] | null>(
  entry: T,
  type?: Struct.Schema
): T extends Entry[] ? TransformedEntry[] : T extends Entry ? TransformedEntry : null;
function transformEntry(
  entry: Entry | Entry[] | null,
  type?: Struct.Schema
): TransformedEntry | TransformedEntry[] | null {
  if (isNil(entry)) {
    return entry;
  }

  if (Array.isArray(entry)) {
    return entry.map((singleEntry) => transformEntry(singleEntry, type));
  }

  if (!isPlainObject(entry)) {
    throw new Error('Entry must be an object');
  }

  const { id, ...properties } = entry;

  const attributeValues: Record<string, unknown> = {};

  for (const key of Object.keys(properties)) {
    const property = properties[key];
    const attribute = type && type.attributes[key];

    if (attribute && attribute.type === 'relation' && isEntry(property) && 'target' in attribute) {
      attributeValues[key] = transformEntry(property, strapi.contentType(attribute.target));
    } else if (attribute && attribute.type === 'component' && isEntry(property)) {
      attributeValues[key] = transformComponent(property, strapi.components[attribute.component]);
    } else if (attribute && attribute.type === 'dynamiczone' && isDZEntries(property)) {
      if (isNil(property)) {
        attributeValues[key] = property;
      }

      attributeValues[key] = property.map((subProperty) => {
        return transformComponent(subProperty, strapi.components[subProperty.__component]);
      });
    } else if (attribute && attribute.type === 'media' && isEntry(property)) {
      attributeValues[key] = transformEntry(property, strapi.contentType('plugin::upload.file'));
    } else {
      attributeValues[key] = property;
    }
  }

  return {
    id,
    ...attributeValues,
    // NOTE: not necessary for now
    // meta: {},
  };
}

export { transformResponse };
