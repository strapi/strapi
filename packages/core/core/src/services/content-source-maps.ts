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
   *
   * The blocks type is an array of nodes — handled in a dedicated branch below
   * because it requires walking the AST to encode the first text leaf of each visual block.
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

type BlocksEncodeMetadata = Omit<FieldContentSourceMap, 'path' | 'type'> & { fieldPath: string };

type EncodeFieldFn = (text: string, metadata: FieldContentSourceMap) => string;

const isObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null;
};

const blocksFieldMetadata = (metadata: BlocksEncodeMetadata): FieldContentSourceMap => ({
  ...metadata,
  path: metadata.fieldPath,
  type: 'blocks',
});

/**
 * Walk a subtree depth-first and stega-encode the first `{ type: 'text', text }` leaf only.
 */
const encodeFirstTextLeaf = (
  node: unknown,
  metadata: BlocksEncodeMetadata,
  encodeField: EncodeFieldFn
): { node: unknown; encoded: boolean } => {
  if (!isObject(node)) {
    return { node, encoded: false };
  }

  if (node.type === 'text' && typeof node.text === 'string') {
    return {
      node: {
        ...node,
        text: encodeField(node.text, blocksFieldMetadata(metadata)),
      },
      encoded: true,
    };
  }

  if (Array.isArray(node.children)) {
    let encoded = false;
    const children = node.children.map((child) => {
      if (encoded) {
        return child;
      }

      const result = encodeFirstTextLeaf(child, metadata, encodeField);
      encoded = result.encoded;
      return result.node;
    });

    return {
      node: { ...node, children },
      encoded,
    };
  }

  return { node, encoded: false };
};

const encodeListBlock = (
  listNode: Record<string, unknown>,
  metadata: BlocksEncodeMetadata,
  encodeField: EncodeFieldFn
): Record<string, unknown> => {
  const children = (listNode.children as unknown[]).map((child) => {
    if (!isObject(child)) {
      return child;
    }

    if (child.type === 'list-item') {
      return encodeFirstTextLeaf(child, metadata, encodeField).node;
    }

    if (child.type === 'list') {
      return encodeListBlock(child, metadata, encodeField);
    }

    return child;
  });

  return { ...listNode, children };
};

const encodeImageBlock = (
  imageNode: Record<string, unknown>,
  metadata: BlocksEncodeMetadata,
  encodeField: EncodeFieldFn
): Record<string, unknown> => {
  if (!isObject(imageNode.image)) {
    return imageNode;
  }

  const fieldMetadata = blocksFieldMetadata(metadata);
  const image = { ...imageNode.image };

  if (typeof image.url === 'string') {
    image.url = encodeField(image.url, fieldMetadata);
  }

  if (typeof image.alternativeText === 'string') {
    image.alternativeText = encodeField(image.alternativeText, fieldMetadata);
  }

  return { ...imageNode, image };
};

/**
 * Pure transformation over a blocks AST. Injects one stega marker per visual block
 * (first text leaf, or image URL / alternativeText) using the blocks field path for all markers.
 * Code blocks are skipped entirely.
 */
const encodeBlocks = (
  blocks: unknown,
  metadata: BlocksEncodeMetadata,
  encodeField: EncodeFieldFn
): unknown => {
  if (!Array.isArray(blocks)) {
    return blocks;
  }

  return blocks.map((block) => {
    if (!isObject(block)) {
      return block;
    }

    switch (block.type) {
      case 'code':
        return block;
      case 'image':
        return encodeImageBlock(block, metadata, encodeField);
      case 'list':
        return encodeListBlock(block, metadata, encodeField);
      case 'paragraph':
      case 'heading':
      case 'quote':
        return encodeFirstTextLeaf(block, metadata, encodeField).node;
      default:
        return block;
    }
  });
};

const createContentSourceMapsService = (strapi: Core.Strapi) => {
  return {
    encodeField(
      text: string,
      { kind, model, documentId, type, path, locale, fieldPath }: FieldContentSourceMap
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

    encodeBlocks(blocks: unknown, metadata: BlocksEncodeMetadata): unknown {
      return encodeBlocks(blocks, metadata, this.encodeField.bind(this));
    },

    async encodeEntry({ data, schema }: EncodingInfo): Promise<any> {
      if (!isObject(data) || data === undefined) {
        return data;
      }

      return traverseEntity(
        ({ key, value, attribute, schema, path, parent }, { set }) => {
          if (!attribute || EXCLUDED_FIELDS.includes(key)) {
            return;
          }

          if (attribute.type === 'blocks' && Array.isArray(value)) {
            const fieldPath = path.rawWithIndices;
            if (!fieldPath) return;
            set(
              key,
              this.encodeBlocks(value, {
                fieldPath,
                kind: schema.kind,
                model: schema.uid as UID.Schema,
                locale: data.locale,
                documentId: data.documentId,
              }) as any
            );
            return;
          }

          if (ENCODABLE_TYPES.includes(attribute.type) && typeof value === 'string') {
            // For inner fields of a multi-media field's items (e.g. `medias.0.url`),
            // drop the array index so all items share the same encoded path. The
            // preview groups them under one highlight and opens the multi-media
            // input as a single field, matching the side editor.
            const parentAttr = parent?.attribute;
            const isInsideMultiMedia =
              parentAttr?.type === 'media' && (parentAttr as any).multiple === true;
            const encodedPath =
              isInsideMultiMedia && parent?.path?.rawWithIndices
                ? `${parent.path.rawWithIndices}.${key}`
                : path.rawWithIndices;
            if (!encodedPath) return;

            set(
              key,
              this.encodeField(value, {
                path: encodedPath,
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

export { createContentSourceMapsService, encodeBlocks };
export type { BlocksEncodeMetadata, EncodeFieldFn };
