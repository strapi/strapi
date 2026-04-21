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
});
