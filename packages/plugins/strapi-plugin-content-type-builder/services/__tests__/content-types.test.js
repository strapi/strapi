'use strict';

const { formatContentType } = require('../ContentTypes');

describe('Content types service', () => {
  describe('format ContentType', () => {
    const contentType = {
      uid: 'test-uid',
      kind: 'singleType',
      plugin: 'some-plugin',
      connection: 'default',
      modelName: 'my-name',
      collectionName: 'tests',
      info: {
        name: 'My name',
        description: 'My description',
      },
      options: {
        draftAndPublish: false,
      },
      attributes: {
        title: {
          type: 'string',
        },
      },
    };

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

    it('Generates a default name', () => {
      expect(
        formatContentType({
          ...contentType,
          info: {
            name: undefined,
          },
        })
      ).toMatchObject({
        schema: {
          name: 'Test-uids',
        },
      });
    });
  });
});
