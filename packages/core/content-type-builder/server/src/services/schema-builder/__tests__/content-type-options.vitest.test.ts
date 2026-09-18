import { describe, expect, it } from 'vitest';

import createSchemaHandler from '../schema-handler';
import createContentTypeBuilder from '../content-type-builder';

const createBuilder = (options: Record<string, unknown>) => {
  const uid = 'api::article.article';
  const contentType = createSchemaHandler({
    uid,
    dir: '/tmp',
    filename: 'schema.json',
    schema: {
      kind: 'collectionType',
      collectionName: 'articles',
      info: {
        singularName: 'article',
        pluralName: 'articles',
        displayName: 'Article',
      },
      options,
      attributes: {
        title: {
          type: 'string',
        },
      },
    } as any,
  });

  return {
    uid,
    contentType,
    builder: {
      contentTypes: new Map([[uid, contentType]]),
      convertAttributes: (attributes: Record<string, unknown>) => attributes,
      ...createContentTypeBuilder(),
    },
  };
};

describe('content-type-builder editContentType options', () => {
  it('preserves schema options omitted by the Content-Type Builder payload', () => {
    const { uid, contentType, builder } = createBuilder({
      draftAndPublish: false,
      populateCreatorFields: true,
      customOption: 'keep-me',
    });

    builder.editContentType({
      uid,
      kind: 'collectionType',
      displayName: 'Article',
      description: '',
      draftAndPublish: false,
      options: {},
      pluginOptions: {},
      attributes: {
        title: { type: 'string' },
        summary: { type: 'text' },
      },
    });

    expect(contentType.schema.options).toEqual({
      draftAndPublish: false,
      populateCreatorFields: true,
      customOption: 'keep-me',
    });
    expect(contentType.getAttribute('summary')).toEqual({ type: 'text' });
  });

  it('allows submitted options and draftAndPublish to override existing values', () => {
    const { uid, contentType, builder } = createBuilder({
      draftAndPublish: false,
      populateCreatorFields: true,
      customOption: 'keep-me',
    });

    builder.editContentType({
      uid,
      kind: 'collectionType',
      displayName: 'Article',
      description: '',
      draftAndPublish: true,
      options: {
        populateCreatorFields: false,
      },
      pluginOptions: {},
      attributes: {
        title: { type: 'string' },
      },
    });

    expect(contentType.schema.options).toEqual({
      draftAndPublish: true,
      populateCreatorFields: false,
      customOption: 'keep-me',
    });
  });
});
