import type { Struct } from '@strapi/types';

import createDataMapperService from '../data-mapper';

const contentType = {
  uid: 'api::article.article',
  modelType: 'contentType',
  modelName: 'article',
  kind: 'collectionType',
  globalId: 'Article',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  options: { draftAndPublish: true },
  attributes: {
    title: { type: 'string' },
    secret: { type: 'string', visible: false },
    author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
    owner: { type: 'relation', relation: 'morphToOne' },
    publishedAt: { type: 'datetime' },
    createdAt: { type: 'datetime' },
    updatedAt: { type: 'datetime' },
    createdBy: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
      visible: false,
    },
  },
} as unknown as Struct.ContentTypeSchema;

const component = {
  uid: 'default.address',
  modelType: 'component',
  modelName: 'address',
  category: 'default',
  globalId: 'ComponentDefaultAddress',
  info: { displayName: 'Address' },
  options: {},
  attributes: {
    street: { type: 'string' },
  },
} as unknown as Struct.ComponentSchema;

describe('data-mapper service', () => {
  describe('toContentManagerModel', () => {
    test('maps a content type to its id, visible attributes, timestamps, creator fields and documentId', () => {
      // the implementation's parameter is typed as a component schema; content types reach it at runtime
      const model = createDataMapperService().toContentManagerModel(
        contentType as unknown as Struct.ComponentSchema
      );

      expect(model.apiID).toBe('article');
      expect(model.isDisplayed).toBe(true);
      expect(Object.keys(model.attributes)).toEqual([
        'id',
        'title',
        'author',
        'createdAt',
        'updatedAt',
        'createdBy',
        'documentId',
      ]);
      expect(model.attributes).toMatchObject({
        id: { type: 'integer' },
        documentId: { type: 'string' },
        author: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::author.author',
          targetModel: 'api::author.author',
          relationType: 'manyToOne',
        },
      });
    });

    test('maps a component to its id, visible attributes and documentId', () => {
      const model = createDataMapperService().toContentManagerModel(component);

      expect(model.apiID).toBe('address');
      expect(Object.keys(model.attributes)).toEqual(['id', 'street', 'documentId']);
      expect(model.attributes).toMatchObject({ street: { type: 'string' } });
    });
  });
});
