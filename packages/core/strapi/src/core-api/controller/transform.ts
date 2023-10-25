import { isNil, isPlainObject } from 'lodash/fp';
import { parseMultipartData } from '@strapi/utils';
import type Koa from 'koa';
import type { Common, Schema, UID } from '@strapi/types';

type TransformedEntry = {
  id: string;
  attributes: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

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

const parseBody = (ctx: Koa.Context) => {
  if (ctx.is('multipart')) {
    return parseMultipartData(ctx);
  }

  const { data } = ctx.request.body || {};

  return { data };
};

const transformResponse = (
  resource: any,
  meta: unknown = {},
  opts: { contentType?: Schema.ContentType | Schema.Component } = {}
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
  component: Schema.Component
): T extends Entry[] ? TransformedComponent[] : T extends Entry ? TransformedComponent : null;
function transformComponent(
  data: Entry | Entry[] | null,
  component: Schema.Component
): TransformedComponent | TransformedComponent[] | null {
  if (Array.isArray(data)) {
    return data.map((datum) => transformComponent(datum, component));
  }

  const res = transformEntry(data, component);

  if (isNil(res)) {
    return res;
  }

  const { id, attributes } = res;
  return { id, ...attributes };
}

function transformEntry<T extends Entry | Entry[] | null>(
  entry: T,
  type?: Schema.ContentType | Schema.Component
): T extends Entry[] ? TransformedEntry[] : T extends Entry ? TransformedEntry : null;
function transformEntry(
  entry: Entry | Entry[] | null,
  type?: Schema.ContentType | Schema.Component
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
      const data = transformEntry(
        property,
        strapi.contentType(attribute.target as Common.UID.ContentType)
      );

      attributeValues[key] = { data };
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
      const data = transformEntry(property, strapi.contentType('plugin::upload.file'));

      attributeValues[key] = { data };
    } else {
      attributeValues[key] = property;
    }
  }

  return {
    id,
    attributes: attributeValues,
    // NOTE: not necessary for now
    // meta: {},
  };
}

export { parseBody, transformResponse };
