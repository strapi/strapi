import type { Struct } from '@strapi/types';
import { formatContentType } from '../content-types';

describe('Content types service', () => {
  describe('format ContentType', () => {
    const contentType = {
      uid: 'test-uid',
      kind: 'singleType',
      plugin: 'some-plugin',
      modelName: 'my-name',
      collectionName: 'tests',
      info: {
        displayName: 'My name',
        singularName: 'my-name',
        pluralName: 'my-names',
        description: 'My description',
      },
      options: {},
      pluginOptions: {
        'content-manager': {
          visible: true,
        },
      },
      attributes: {
        title: {
          type: 'string',
        },
      },
    } as unknown as Struct.ContentTypeSchema;

    it('Returns consistent schemas', () => {
      expect(formatContentType(contentType)).toMatchSnapshot();
    });

    it('Sets default kind', () => {
      expect(
        formatContentType({
          ...contentType,
          kind: undefined,
        })
      ).toMatchObject({
        schema: {
          kind: 'collectionType',
        },
      });
    });
  });
});
