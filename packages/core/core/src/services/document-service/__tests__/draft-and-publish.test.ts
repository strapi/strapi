import type { Struct } from '@strapi/types';

import {
  filterDataPublishedAt,
  setStatusToDraft,
  statusToData,
  statusToLookup,
} from '../draft-and-publish';

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
  it('supports partially applying the content type without changing input params', () => {
    const params = { data: { title: 'Draft' } };
    const toDraft = setStatusToDraft(dpContentType);

    expect(toDraft(params)).toEqual(setStatusToDraft(dpContentType, params));
    expect(toDraft(params).data).toBe(params.data);
    expect(params).not.toHaveProperty('status');
  });

  it('adds publication lookup constraints without mutating or replacing unrelated branches', () => {
    const params = {
      status: 'published' as const,
      data: { title: 'Draft' },
      lookup: { locale: 'en' },
    };

    const result = statusToLookup(dpContentType)(params);

    expect(result.lookup).toEqual({ locale: 'en', publishedAt: { $notNull: true } });
    expect(params.lookup).toEqual({ locale: 'en' });
    expect(result.data).toBe(params.data);
  });

  it('preserves nested data when clearing publication timestamps', () => {
    const params = {
      status: 'draft' as const,
      data: { title: 'Draft', publishedAt: '2026-01-01T00:00:00.000Z' },
      lookup: { locale: 'en' },
    };

    for (const result of [statusToData(dpContentType)(params), filterDataPublishedAt(params)]) {
      expect(result.data).toEqual({ title: 'Draft', publishedAt: null });
      expect(result.lookup).toBe(params.lookup);
    }
    expect(params.data.publishedAt).toBe('2026-01-01T00:00:00.000Z');
  });

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
