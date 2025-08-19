import { vercelStegaCombine } from '@vercel/stega';
import type { Core, Struct } from '@strapi/types';

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
    encodeField(text: string, key: string): string {
      const res = vercelStegaCombine(text, {
        // TODO: smarter metadata than just the key
        key,
      });
      return res;
    },

    async encodeEntry(entryRootId: any, entryRootModel: string, entryData: any, model: any) {
      if (typeof entryData !== 'object' || entryData === null || entryData === undefined) {
        return;
      }

      Object.keys(entryData).forEach((key) => {
        const value = entryData[key];

        // Skip encoding if the value is null or undefined
        if (value === null || value === undefined) {
          return;
        }

        const attribute = model.attributes[key];

        if (!attribute || EXCLUDED_FIELDS.includes(key)) {
          return;
        }

        if (ENCODABLE_TYPES.includes(attribute.type)) {
          entryData[key] = this.encodeField(
            value,
            // TODO: smarter metadata than just the key
            key
          );

          return;
        }

        if (attribute.type === 'component') {
          const componentModel = strapi.getModel(attribute.component);

          if (Array.isArray(value)) {
            return value.forEach((item) => {
              return this.encodeEntry(entryRootId, entryRootModel, item, componentModel);
            });
          }

          return this.encodeEntry(entryRootId, entryRootModel, value, componentModel);
        }

        if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
          return value.forEach((item) => {
            return this.encodeEntry(
              entryRootId,
              entryRootModel,
              item,
              strapi.getModel(item.__component)
            );
          });
        }

        if (attribute.type === 'relation') {
          const relatedModel = strapi.getModel(attribute.target);

          if (Array.isArray(value)) {
            return value.forEach((item: any) => {
              return this.encodeEntry(
                item.id,
                relatedModel.uid,
                item,
                strapi.getModel(attribute.target)
              );
            });
          }

          return this.encodeEntry(
            value.id,
            relatedModel.uid,
            value,
            strapi.getModel(attribute.target)
          );
        }

        if (attribute.type === 'media') {
          const fileModel = strapi.getModel('plugin::upload.file');

          if (Array.isArray(value.data)) {
            return value.data.forEach((item: any) => {
              return this.encodeEntry(entryRootId, entryRootModel, item, fileModel);
            });
          }

          return this.encodeEntry(entryRootId, entryRootModel, value.data, fileModel);
        }
      });
    },

    async encodeSourceMaps(
      data: any,
      contentType: Struct.ContentTypeSchema,
      rootId?: any,
      rootModel?: string
    ): Promise<void> {
      if (Array.isArray(data)) {
        data.forEach((item) => this.encodeSourceMaps(item, contentType));
        return;
      }

      if (typeof data !== 'object' || data === null) {
        return;
      }

      const actualRootId = rootId || data.id;
      const actualRootModel = rootModel || contentType.uid;

      await this.encodeEntry(actualRootId, actualRootModel, data, contentType);
    },
  };
};

export { createContentSourceMapsService };
