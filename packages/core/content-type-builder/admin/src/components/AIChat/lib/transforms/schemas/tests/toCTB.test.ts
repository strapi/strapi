import { transformAttributesFromChatToCTB, transformChatToCTB } from '../toCTB';

import type { ContentType, Component } from '../../../../../../types';
import type { Schema } from '../../../types/schema';
import type { UID } from '@strapi/types';

const makeSchema = (overrides: Partial<Schema> = {}): Schema => ({
  action: 'create',
  kind: 'collectionType',
  uid: 'api::product.product',
  modelType: 'contentType',
  name: 'Product',
  attributes: {
    title: { type: 'string' },
  },
  ...overrides,
});

describe('transformChatToCTB', () => {
  describe('draftAndPublish default', () => {
    it('should default draftAndPublish to true when AI does not set it', () => {
      const schema = makeSchema({ options: undefined });
      const result = transformChatToCTB(schema) as ContentType;

      expect(result).toMatchObject({ options: { draftAndPublish: true } });
    });

    it('should default draftAndPublish to true when options object is empty', () => {
      const schema = makeSchema({ options: {} });
      const result = transformChatToCTB(schema) as ContentType;

      expect(result).toMatchObject({ options: { draftAndPublish: true } });
    });

    it('should respect explicit draftAndPublish: false from AI', () => {
      const schema = makeSchema({ options: { draftAndPublish: false } });
      const result = transformChatToCTB(schema) as ContentType;

      expect(result).toMatchObject({ options: { draftAndPublish: false } });
    });

    it('should respect explicit draftAndPublish: true from AI', () => {
      const schema = makeSchema({ options: { draftAndPublish: true } });
      const result = transformChatToCTB(schema) as ContentType;

      expect(result).toMatchObject({ options: { draftAndPublish: true } });
    });
  });

  describe('plugin content-types', () => {
    it('preserves identity fields when updating an existing plugin content-type', () => {
      const oldSchema: ContentType = {
        uid: 'plugin::my-plugin.my-thing' as UID.ContentType,
        modelType: 'contentType',
        kind: 'collectionType',
        plugin: 'my-plugin',
        modelName: 'my-thing',
        collectionName: 'my_plugin_my_things',
        globalId: 'MyPluginMyThing',
        visible: true,
        status: 'UNCHANGED',
        restrictRelationsTo: null,
        info: {
          displayName: 'My thing',
          singularName: 'my-thing',
          pluralName: 'my-things',
        },
        options: { draftAndPublish: false },
        pluginOptions: { i18n: { localized: true } },
        attributes: [],
      };

      const schema = makeSchema({
        uid: 'plugin::my-plugin.my-thing',
        name: 'Wrong Name From Ai',
        action: 'update',
        attributes: { title: { type: 'string' } },
      });

      const result = transformChatToCTB(schema, oldSchema) as ContentType;

      expect(result.plugin).toBe('my-plugin');
      expect(result.globalId).toBe('MyPluginMyThing');
      expect(result.modelName).toBe('my-thing');
      expect(result.collectionName).toBe('my_plugin_my_things');
      expect(result.info.singularName).toBe('my-thing');
      expect(result.info.pluralName).toBe('my-things');
      expect(result.options).toMatchObject({ draftAndPublish: false });
      expect(result.pluginOptions?.i18n).toMatchObject({ localized: true });
    });
  });

  describe('rename migration compatibility', () => {
    const oldSchema: ContentType = {
      uid: 'api::article.article' as any,
      modelType: 'contentType',
      kind: 'collectionType',
      modelName: 'article',
      collectionName: 'articles',
      globalId: 'Article',
      visible: true,
      status: 'UNCHANGED',
      restrictRelationsTo: null,
      info: {
        displayName: 'Article',
        singularName: 'article',
        pluralName: 'articles',
      },
      options: { draftAndPublish: true },
      pluginOptions: { i18n: { localized: false } },
      attributes: [
        { name: 'title', type: 'string', required: true, status: 'UNCHANGED' },
        { name: 'body', type: 'blocks', status: 'UNCHANGED' },
      ],
    };

    it('infers a rename when the AI replaces one field with another of the same config', () => {
      const schema = makeSchema({
        uid: 'api::article.article',
        name: 'Article',
        action: 'update',
        attributes: {
          heading: { type: 'string', required: true },
          body: { type: 'blocks' },
        },
      });

      const result = transformChatToCTB(schema, oldSchema) as ContentType;

      expect(result.renames).toEqual([{ oldName: 'title', newName: 'heading' }]);
      expect(result.attributes).toEqual([
        { name: 'heading', type: 'string', required: true, status: 'CHANGED' },
        { name: 'body', type: 'blocks', status: 'UNCHANGED' },
      ]);
    });

    it('uses explicit schema-level renames when provided by the AI server', () => {
      const schema = makeSchema({
        uid: 'api::article.article',
        name: 'Article',
        action: 'update',
        renames: [{ oldName: 'title', newName: 'heading' }],
        attributes: {
          heading: { type: 'string', required: true },
          body: { type: 'blocks' },
        },
      });

      const result = transformChatToCTB(schema, oldSchema) as ContentType;

      expect(result.renames).toEqual([{ oldName: 'title', newName: 'heading' }]);
    });

    it('uses attribute-level previousName metadata when provided', () => {
      const schema = makeSchema({
        uid: 'api::article.article',
        name: 'Article',
        action: 'update',
        attributes: {
          heading: { type: 'string', required: true, previousName: 'title' },
          body: { type: 'blocks' },
        },
      });

      const { attributes, renames } = transformAttributesFromChatToCTB(schema, oldSchema);

      expect(renames).toEqual([{ oldName: 'title', newName: 'heading' }]);
      expect(attributes).toEqual([
        { name: 'heading', type: 'string', required: true, status: 'CHANGED' },
        { name: 'body', type: 'blocks', status: 'UNCHANGED' },
      ]);
    });

    it('does not treat delete+add with different configs as a rename', () => {
      const schema = makeSchema({
        uid: 'api::article.article',
        name: 'Article',
        action: 'update',
        attributes: {
          summary: { type: 'text' },
          body: { type: 'blocks' },
        },
      });

      const result = transformChatToCTB(schema, oldSchema) as ContentType;

      expect(result.renames).toBeUndefined();
      expect(result.attributes).toEqual([
        { name: 'summary', type: 'text', status: 'NEW' },
        { name: 'body', type: 'blocks', status: 'UNCHANGED' },
        { name: 'title', type: 'string', required: true, status: 'REMOVED' },
      ]);
    });
  });

  describe('kind fallback', () => {
    it('keeps a valid content-type kind', () => {
      const result = transformChatToCTB(makeSchema({ kind: 'singleType' })) as ContentType;

      expect(result.kind).toBe('singleType');
    });

    it('falls back to collectionType when the kind is not a content-type kind', () => {
      // AI can emit `kind: 'component'` (or omit it) on a contentType payload; the guard coerces
      // any non-content-type kind to 'collectionType' rather than passing it through.
      const componentKind = transformChatToCTB(makeSchema({ kind: 'component' })) as ContentType;
      expect(componentKind.kind).toBe('collectionType');

      const missingKind = transformChatToCTB(makeSchema({ kind: undefined })) as ContentType;
      expect(missingKind.kind).toBe('collectionType');
    });
  });

  describe('singularName / pluralName preservation', () => {
    it('does not carry identity from an old *component* schema into a content-type', () => {
      // previousContentType is only set when oldSchema.modelType === 'contentType', so a component
      // oldSchema must NOT leak its names — the content-type falls back to names computed from the
      // schema name ("Product" -> product / products).
      const oldComponent = {
        modelType: 'component',
        uid: 'default.thing',
        info: { singularName: 'leaked-singular', pluralName: 'leaked-plural' },
        attributes: [],
      } as unknown as Component;

      const result = transformChatToCTB(
        makeSchema({ name: 'Product', action: 'update' }),
        oldComponent
      ) as ContentType;

      expect(result.info.singularName).toBe('product');
      expect(result.info.pluralName).toBe('products');
    });
  });
});
