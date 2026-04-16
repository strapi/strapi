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

type EncodableFieldContentSourceMap = FieldContentSourceMap & {
  fieldPath?: string;
};

const isObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null;
};

const isBlocksLikeValue = (value: unknown): boolean => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((node) => {
    if (!isObject(node)) {
      return false;
    }

    return typeof node.type === 'string' && Array.isArray(node.children);
  });
};

const createContentSourceMapsService = (strapi: Core.Strapi) => {
  return {
    encodeField(
      text: string,
      { kind, model, documentId, type, path, locale, fieldPath }: EncodableFieldContentSourceMap
    ) {
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
      if (fieldPath) {
        strapiSource.set('fieldPath', fieldPath);
      }

      const encoded = vercelStegaCombine(
        text,
        {
          strapiSource: strapiSource.toString(),
        },
        false
      );

      return encoded;
    },

    encodeBlocks(
      blocks: unknown,
      metadata: Omit<EncodableFieldContentSourceMap, 'path' | 'type'> & {
        path: string;
        fieldPath: string;
      }
    ): unknown {
      const visitNode = (node: unknown, currentPath: string): unknown => {
        if (Array.isArray(node)) {
          return node.map((child, index) => visitNode(child, `${currentPath}.${index}`));
        }

        if (!isObject(node)) {
          return node;
        }

        return Object.entries(node).reduce(
          (acc, [nodeKey, nodeValue]) => {
            if (nodeKey === 'text' && typeof nodeValue === 'string') {
              acc[nodeKey] = this.encodeField(nodeValue, {
                ...metadata,
                path: `${currentPath}.text`,
                type: 'blocks',
                fieldPath: metadata.fieldPath,
              });
              return acc;
            }

            if (nodeKey === 'children' && Array.isArray(nodeValue)) {
              acc[nodeKey] = nodeValue.map((child, index) =>
                visitNode(child, `${currentPath}.children.${index}`)
              );
              return acc;
            }

            acc[nodeKey] = nodeValue;
            return acc;
          },
          {} as Record<string, unknown>
        );
      };

      return visitNode(blocks, metadata.path);
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

          const fieldPath = path.rawWithIndices ?? key;

          if (
            (attribute.type === 'blocks' || attribute.type === 'json') &&
            isBlocksLikeValue(value)
          ) {
            set(
              key,
              this.encodeBlocks(value, {
                path: fieldPath,
                fieldPath,
                kind: schema.kind,
                model: schema.uid as UID.Schema,
                locale: data.locale,
                documentId: data.documentId,
              }) as any
            );
            return;
          }

          if (attribute.type === 'media' && isObject(value)) {
            const encodeMediaItem = (item: any, index?: number) => {
              if (!isObject(item) || typeof item.url !== 'string') {
                return item;
              }

              let itemPath = fieldPath;
              if (index !== undefined) {
                itemPath = `${itemPath}.${index}`;
              }

              const encodedUrl = this.encodeField(item.url, {
                path: `${itemPath}.url`,
                type: attribute.type,
                kind: schema.kind,
                model: schema.uid as UID.Schema,
                locale: data.locale,
                documentId: data.documentId,
              });

              return {
                ...item,
                url: encodedUrl,
              };
            };

            if (Array.isArray(value)) {
              set(key, value.map((item, index) => encodeMediaItem(item, index)) as any);
            } else {
              set(key, encodeMediaItem(value));
            }
            return;
          }

          if (ENCODABLE_TYPES.includes(attribute.type) && typeof value === 'string') {
            set(
              key,
              this.encodeField(value, {
                path: fieldPath,
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
