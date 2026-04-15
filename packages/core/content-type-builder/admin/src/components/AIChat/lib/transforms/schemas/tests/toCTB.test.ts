import { transformChatToCTB } from '../toCTB';

import type { ContentType } from '../../../../../../types';
import type { Schema } from '../../../types/schema';

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
        uid: 'plugin::my-plugin.my-thing' as any,
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
});
