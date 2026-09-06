import type { Struct } from '@strapi/types';

import { setStatusToDraft } from '../draft-and-publish';

const createContentType = (draftAndPublish: boolean): Struct.CollectionTypeSchema => ({
  uid: 'api::test.test',
  kind: 'collectionType',
  collectionName: 'tests',
  modelName: 'test',
  modelType: 'contentType',
  globalId: 'Test',
  info: {
    displayName: 'Test',
    singularName: 'test',
    pluralName: 'tests',
  },
  options: {
    draftAndPublish,
  },
  attributes: {},
});

const dpContentType = createContentType(true);
const nonDpContentType = createContentType(false);

describe('Draft and Publish transforms', () => {
  describe('setStatusToDraft', () => {
    it('defaults Draft & Publish content types to draft when status is undefined', () => {
      expect(setStatusToDraft(dpContentType, { data: {} })).toMatchObject({
        data: {},
        status: 'draft',
      });
    });

    it('forces Draft & Publish content types to draft when status is provided', () => {
      expect(setStatusToDraft(dpContentType, { data: {}, status: 'published' })).toMatchObject({
        data: {},
        status: 'draft',
      });
    });

    it('preserves non-Draft & Publish params when status is undefined', () => {
      const params = { data: {} };

      expect(setStatusToDraft(nonDpContentType, params)).toBe(params);
      expect(params).not.toHaveProperty('status');
    });

    it('preserves non-Draft & Publish params when status is provided', () => {
      expect(setStatusToDraft(nonDpContentType, { data: {}, status: 'published' })).toMatchObject({
        data: {},
        status: 'published',
      });
    });
  });
});
