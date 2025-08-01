import { vercelStegaCombine } from '@vercel/stega';
import type { Core, Struct } from '@strapi/types';

const BASE_EDIT_URL = '/admin/content-manager/collectionType';
const ENCODABLE_TYPES = [
  'string',
  'text',
  'richtext',
  'uid',
  'enumeration',
  'email',
  'date',
  'datetime',
  'time',
  'timestamp',
];

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
    get config() {
      const apiConfig = strapi.config.get<Core.Config.Api>('api');
      const config = apiConfig?.contentSourceMaps;

      if (!config) {
        return {
          // TODO: decide what defaults would make sense
          enabled: true,
        };
      }

      return config;
    },

    isEnabled(): boolean {
      return this.config.enabled;
    },

    async encodeSourceMaps(
      data: any,
      contentType: Struct.ContentTypeSchema,
      rootId?: any,
      rootModel?: string
    ): Promise<void> {
      if (!this.isEnabled()) {
        return;
      }

      const fileModel = strapi.getModel('plugin::upload.file');

      function encodeEditInfo(text: string, href: string): string {
        const res = vercelStegaCombine(text, {
          href,
        });
        return res;
      }

      async function encodeEntry(
        entryRootId: any,
        entryRootModel: string,
        entryData: any,
        model: any
      ) {
        if (typeof entryData !== 'object' || entryData === null || entryData === undefined) {
          return;
        }

        Object.keys(entryData).forEach((key) => {
          const value = entryData[key];

          // Skip encoding if the value is null or undefined
          if (value === null || value === undefined) return;

          const attribute = model.attributes[key];

          if (attribute && !EXCLUDED_FIELDS.includes(key)) {
            if (ENCODABLE_TYPES.includes(attribute.type)) {
              entryData[key] = encodeEditInfo(
                value,
                `${BASE_EDIT_URL}/${entryRootModel}/${entryRootId}`
              );
              return;
            }

            if (attribute.type === 'component') {
              const componentModel = strapi.getModel(attribute.component);

              if (Array.isArray(value)) {
                return value.forEach((item) => {
                  return encodeEntry(entryRootId, entryRootModel, item, componentModel);
                });
              }

              return encodeEntry(entryRootId, entryRootModel, value, componentModel);
            }

            if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
              return value.forEach((item) => {
                return encodeEntry(
                  entryRootId,
                  entryRootModel,
                  item,
                  strapi.getModel(item.__component)
                );
              });
            }

            if (attribute.type === 'relation') {
              const relatedModel = strapi.getModel(attribute.target);

              if (Array.isArray(value.data)) {
                return value.data.forEach((item: any) => {
                  return encodeEntry(
                    item.id,
                    relatedModel.uid,
                    item.attributes,
                    strapi.getModel(attribute.target)
                  );
                });
              }

              return encodeEntry(
                value.data.id,
                relatedModel.uid,
                value.data.attributes,
                strapi.getModel(attribute.target)
              );
            }

            if (attribute.type === 'media') {
              if (Array.isArray(value.data)) {
                return value.data.forEach((item: any) => {
                  return encodeEntry(entryRootId, entryRootModel, item.attributes, fileModel);
                });
              }

              return encodeEntry(entryRootId, entryRootModel, value.data?.attributes, fileModel);
            }
          }
        });
      }

      if (Array.isArray(data)) {
        data.forEach((item) => this.encodeSourceMaps(item, contentType));
        return;
      }

      if (typeof data !== 'object' || data === null) {
        return;
      }

      const actualRootId = rootId || data.id;
      const actualRootModel = rootModel || contentType.uid;

      await encodeEntry(actualRootId, actualRootModel, data, contentType);
    },
  };
};

export { createContentSourceMapsService };
export type ContentSourceMapsService = Core.ContentSourceMaps.Service;
