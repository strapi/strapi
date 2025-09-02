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

const createContentSourceMapsService = (strapi: Core.Strapi) => {
  const baseUrl = strapi.config.get('server.url') as string;

  return {
    encodeField(
      text: string,
      { kind, model, documentId, type, path, locale }: FieldContentSourceMap
    ) {
      /**
       * Combine all metadata into into a one string so we only have to deal with one data-atribute
       * on the frontend. Make it human readable because that data-attribute may be set manually by
       * users for fields that don't support sourcemap encoding.
       * The "URL" doesn't need to go anywhere, it's just a way to format the information.
       */
      const strapiSource = new URL(baseUrl ?? 'https://strapi.io');
      strapiSource.searchParams.set('documentId', documentId);
      strapiSource.searchParams.set('type', type);
      strapiSource.searchParams.set('path', path);

      if (model) {
        strapiSource.searchParams.set('model', model);
      }
      if (kind) {
        strapiSource.searchParams.set('kind', kind);
      }
      if (locale) {
        strapiSource.searchParams.set('locale', locale);
      }

      return vercelStegaCombine(text, { strapiSource: strapiSource.toString() });
    },

    async encodeEntry({ data, schema }: EncodingInfo): Promise<any> {
      if (typeof data !== 'object' || data === null || data === undefined) {
        return data;
      }

      return traverseEntity(
        ({ key, value, attribute, schema, path }, { set }) => {
          if (!attribute || EXCLUDED_FIELDS.includes(key)) {
            return;
          }

          if (ENCODABLE_TYPES.includes(attribute.type) && typeof value === 'string') {
            set(
              key,
              this.encodeField(value, {
                path: path.rawWithIndices!,
                type: attribute.type,
                kind: schema.kind,
                model: schema.uid as UID.Schema,
                locale: data.locale,
                documentId: data.documentId,
              }) as any
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
      // try {
      if (Array.isArray(data)) {
        return Promise.all(data.map((item) => this.encodeSourceMaps({ data: item, schema })));
      }

      if (typeof data !== 'object' || data === null) {
        return data;
      }

      return this.encodeEntry({ data, schema });
      // } catch (error) {
      //   strapi.log.error('Error encoding source maps:', error);
      //   return data;
      // }
    },
  };
};

export { createContentSourceMapsService };
