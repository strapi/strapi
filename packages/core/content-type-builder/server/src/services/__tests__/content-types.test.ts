import { Schema } from '@strapi/types';
import getContentTypes from '../content-types';

const { formatContentType } = getContentTypes();
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
      options: {
        draftAndPublish: false,
      },
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
    } as unknown as Schema.ContentType;

    it('Returns consistent schemas', () => {
      expect(formatContentType(contentType)).toMatchSnapshot();
    });

    it('Sets default kind', () => {
      expect(
        formatContentType({
          ...contentType,
          // @ts-expect-error testing invalid inputs
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
