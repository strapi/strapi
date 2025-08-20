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

    async encodeEntry(options: {
      entryRootId: any;
      entryRootModel: string;
      entryData: any;
      model: any;
    }): Promise<any> {
      const { entryRootId, entryRootModel, entryData, model } = options;

      if (typeof entryData !== 'object' || entryData === null || entryData === undefined) {
        return entryData;
      }

      const encodedData = { ...entryData };

      Object.keys(entryData).forEach(async (key) => {
        const value = entryData[key];

        if (value === null || value === undefined) {
          return;
        }

        const attribute = model.attributes[key];

        if (!attribute || EXCLUDED_FIELDS.includes(key)) {
          return;
        }

        if (ENCODABLE_TYPES.includes(attribute.type)) {
          encodedData[key] = this.encodeField(
            value,
            // TODO: smarter metadata than just the key
            key
          );
        }

        if (attribute.type === 'component') {
          const componentModel = strapi.getModel(attribute.component);

          if (Array.isArray(value)) {
            encodedData[key] = await Promise.all(
              value.map((item) =>
                this.encodeEntry({
                  entryRootId,
                  entryRootModel,
                  entryData: item,
                  model: componentModel,
                })
              )
            );
          }

          encodedData[key] = await this.encodeEntry({
            entryRootId,
            entryRootModel,
            entryData: value,
            model: componentModel,
          });
        }

        if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
          encodedData[key] = await Promise.all(
            value.map((item) =>
              this.encodeEntry({
                entryRootId,
                entryRootModel,
                entryData: item,
                model: strapi.getModel(item.__component),
              })
            )
          );
        }

        if (attribute.type === 'relation') {
          const relatedModel = strapi.getModel(attribute.target);

          if (Array.isArray(value)) {
            encodedData[key] = await Promise.all(
              value.map((item: any) =>
                this.encodeEntry({
                  entryRootId: item.id,
                  entryRootModel: relatedModel.uid,
                  entryData: item,
                  model: strapi.getModel(attribute.target),
                })
              )
            );
          }

          encodedData[key] = await this.encodeEntry({
            entryRootId: value.id,
            entryRootModel: relatedModel.uid,
            entryData: value,
            model: strapi.getModel(attribute.target),
          });
        }

        if (attribute.type === 'media') {
          const fileModel = strapi.getModel('plugin::upload.file');

          if (Array.isArray(value.data)) {
            const encodedMediaData = await Promise.all(
              value.data.map((item: any) =>
                this.encodeEntry({
                  entryRootId,
                  entryRootModel,
                  entryData: item,
                  model: fileModel,
                })
              )
            );
            encodedData[key] = { ...value, data: encodedMediaData };
          } else {
            const encodedMediaItem = await this.encodeEntry({
              entryRootId,
              entryRootModel,
              entryData: value.data,
              model: fileModel,
            });
            encodedData[key] = { ...value, data: encodedMediaItem };
          }
        }
      });

      return encodedData;
    },

    async encodeSourceMaps(options: {
      data: any;
      contentType: Struct.ContentTypeSchema;
      rootId?: any;
      rootModel?: string;
    }): Promise<any> {
      const { data, contentType, rootId, rootModel } = options;

      if (Array.isArray(data)) {
        return Promise.all(data.map((item) => this.encodeSourceMaps({ data: item, contentType })));
      }

      if (typeof data !== 'object' || data === null) {
        return data;
      }

      const actualRootId = rootId || data.id;
      const actualRootModel = rootModel || contentType.uid;

      return this.encodeEntry({
        entryRootId: actualRootId,
        entryRootModel: actualRootModel,
        entryData: data,
        model: contentType,
      });
    },
  };
};

export { createContentSourceMapsService };
