import { vercelStegaCombine } from '@vercel/stega';
import type { Core, Struct, UID } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import type { FieldContentSourceMap } from '@strapi/admin/strapi-admin';

const ENCODABLE_TYPES = [
  'string',
  'text',
  'richtext',
  'biginteger',
  'date',
  'time',
  'datetime',
  'timestamp',
  'boolean',
  'enumeration',
  'json',
  'media',
  'email',
  'password',
  /**
   * We cannot modify the response shape, so types that aren't based on string cannot be encoded:
   * - json: object
   * - blocks: object, will require a custom implementation in a dedicated PR
   * - integer, float and decimal: number
   * - boolean: boolean (believe it or not)
   * - uid: can be stringified but would mess up URLs
   */
];

// TODO: use a centralized store for these fields that would be shared with the CM and CTB
const EXCLUDED_FIELDS = [
  'id',
  'documentId',
  'locale',
  'localizations',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
  'publishedAt',
];

interface EncodingInfo {
  data: any;
  schema: Struct.Schema;
}

const isObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null;
};

/**
 * Property added to media objects to carry a stega-encoded source map. Integrators render this
 * value as a `data-strapi-source` attribute on their media wrapper so the preview script can
 * patch the media in place. We can't embed zero-width stega characters in `src` URLs (they'd
 * break the URL), so we surface the metadata as a separate property instead.
 */
const MEDIA_MARKER_PROPERTY = '_strapiSource';

const createContentSourceMapsService = (strapi: Core.Strapi) => {
  return {
    buildSourceString({
      kind,
      model,
      documentId,
      type,
      path,
      locale,
      root,
    }: FieldContentSourceMap) {
      /**
       * Combine all metadata into into a one string so we only have to deal with one data-atribute
       * on the frontend. Make it human readable because that data-attribute may be set manually by
       * users for fields that don't support sourcemap encoding.
       */
      const strapiSource = new URLSearchParams();
      strapiSource.set('documentId', documentId);
      strapiSource.set('type', type);
      strapiSource.set('path', path);

      if (model) {
        strapiSource.set('model', model);
      }
      if (kind) {
        strapiSource.set('kind', kind);
      }
      if (locale) {
        strapiSource.set('locale', locale);
      }
      if (root) {
        strapiSource.set('root', 'true');
      }

      return strapiSource.toString();
    },

    encodeField(text: string, meta: FieldContentSourceMap) {
      return vercelStegaCombine(text, { strapiSource: this.buildSourceString(meta) });
    },

    async encodeEntry({ data, schema }: EncodingInfo): Promise<any> {
      if (!isObject(data) || data === undefined) {
        return data;
      }

      return traverseEntity(
        ({ key, value, attribute, schema, path }, { set }) => {
          if (!attribute || EXCLUDED_FIELDS.includes(key)) {
            return;
          }

          const baseMeta = {
            path: path.rawWithIndices!,
            type: attribute.type,
            kind: schema.kind,
            model: schema.uid as UID.Schema,
            locale: data.locale,
            documentId: data.documentId,
          } satisfies FieldContentSourceMap;

          // String-like leaves: embed stega directly into the value
          if (ENCODABLE_TYPES.includes(attribute.type) && typeof value === 'string') {
            set(key, this.encodeField(value, baseMeta) as any);
            return;
          }

          // Media field (single object): add a marker property carrying the metadata.
          // The media object's string sub-properties (url, alt, etc.) are still traversed
          // and encoded by this same visitor in the recursion that follows.
          if (attribute.type === 'media' && isObject(value) && !Array.isArray(value)) {
            set(key, {
              ...value,
              [MEDIA_MARKER_PROPERTY]: this.buildSourceString({ ...baseMeta, root: true }),
            } as any);
            return;
          }

          // Media field (multiple): mark each item with its indexed path.
          if (attribute.type === 'media' && Array.isArray(value)) {
            set(
              key,
              value.map((item, i) =>
                isObject(item) && !Array.isArray(item)
                  ? {
                      ...item,
                      [MEDIA_MARKER_PROPERTY]: this.buildSourceString({
                        ...baseMeta,
                        path: `${baseMeta.path}.${i}`,
                        root: true,
                      }),
                    }
                  : item
              ) as any
            );
          }
        },
        {
          schema,
          getModel: (uid) => strapi.getModel(uid as UID.Schema),
        },
        data
      );
    },

    async encodeSourceMaps({ data, schema }: EncodingInfo): Promise<any> {
      try {
        if (Array.isArray(data)) {
          return await Promise.all(
            data.map((item) => this.encodeSourceMaps({ data: item, schema }))
          );
        }

        if (!isObject(data)) {
          return data;
        }

        return await this.encodeEntry({ data, schema });
      } catch (error) {
        strapi.log.error('Error encoding source maps:', error);
        return data;
      }
    },
  };
};

export { createContentSourceMapsService };
