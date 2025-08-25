import { vercelStegaCombine } from '@vercel/stega';
import type { Core, Struct } from '@strapi/types';
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

const createContentSourceMapsService = (strapi: Core.Strapi) => {
  return {
    encodeField(text: string, key: string): string {
      const res = vercelStegaCombine(text, {
        // TODO: smarter metadata than just the key
        key,
      });
      return res;
    },

    async encodeEntry(options: {
      entryRootId: any;
      entryRootModel: string;
      entryData: any;
      model: any;
    }): Promise<any> {
      const { entryData, model } = options;

      if (typeof entryData !== 'object' || entryData === null || entryData === undefined) {
        return entryData;
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
          schema: model,
          getModel: (uid: string) => strapi.getModel(uid as any),
        },
        entryData
      );
    },

    async encodeSourceMaps(options: {
      data: any;
      contentType: Struct.ContentTypeSchema;
      rootId?: any;
      rootModel?: string;
    }): Promise<any> {
      const { data, contentType, rootId, rootModel } = options;

      try {
        if (Array.isArray(data)) {
          return await Promise.all(
            data.map((item) => this.encodeSourceMaps({ data: item, contentType }))
          );
        }

        if (typeof data !== 'object' || data === null) {
          return data;
        }

        const actualRootId = rootId || data.id;
        const actualRootModel = rootModel || contentType.uid;

        return await this.encodeEntry({
          entryRootId: actualRootId,
          entryRootModel: actualRootModel,
          entryData: data,
          model: contentType,
        });
      } catch (error) {
        strapi.log.error('Error encoding source maps:', error);
        return data;
      }
    },
  };
};

export { createContentSourceMapsService };
