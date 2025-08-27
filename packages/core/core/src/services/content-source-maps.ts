import { vercelStegaCombine } from '@vercel/stega';
import type { Core, Struct, UID } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';

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
  'uid',
  /**
   * We cannot modify the response shape, so types that aren't based on string cannot be encoded:
   * - json: object
   * - blocks: object, will require a custom implementation in a dedicated PR
   * - integer, float and decimal: number
   * - boolean: boolean (believe it or not)
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
  return {
    encodeField(text: string, key: string): string {
      const res = vercelStegaCombine(text, {
        // TODO: smarter metadata than just the key
        key,
      });
      return res;
    },

    async encodeEntry({ data, schema }: EncodingInfo): Promise<any> {
      if (typeof data !== 'object' || data === null || data === undefined) {
        return data;
      }

      return traverseEntity(
        ({ key, value, attribute }, { set }) => {
          if (!attribute || EXCLUDED_FIELDS.includes(key)) {
            return;
          }

          if (ENCODABLE_TYPES.includes(attribute.type) && typeof value === 'string') {
            set(key, this.encodeField(value, key) as any);
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

        if (typeof data !== 'object' || data === null) {
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
