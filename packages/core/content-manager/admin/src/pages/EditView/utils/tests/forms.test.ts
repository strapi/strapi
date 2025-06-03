import { ComponentsDictionary, Schema } from '../../../../hooks/useDocument';
import { createDefaultForm } from '../forms';

describe('forms', () => {
  describe('createDefaultForm', () => {
    const contentType: Schema = {
      uid: 'api::test.test',
      apiID: 'api::test.test',
      isDisplayed: true,
      modelType: 'contentType',
      kind: 'collectionType',
      info: {
        displayName: 'test',
        singularName: 'test',
        pluralName: 'tests',
      },
      modelName: 'test',
      globalId: 'api::test.test',
      attributes: {
        test: {
          type: 'text',
        },
      },
    };

    it('should return an empty object if there is no default value', () => {
      expect(createDefaultForm(contentType)).toEqual({});
    });

    it('should init the requide dynamic zone type with an empty array', () => {
      expect(
        createDefaultForm({
          ...contentType,
          attributes: {
            test: { type: 'dynamiczone', required: true, components: ['basic.simple'] },
          },
        })
      ).toEqual({
        test: [],
      });
    });

    it('should set the default values correctly', () => {
      expect(
        createDefaultForm({
          ...contentType,
          attributes: {
            text: {
              type: 'text',
              default: 'test',
            },
            email: {
              type: 'email',
              default: 'test@test.com',
            },
            date: {
              type: 'date',
            },
          },
        })
      ).toEqual({
        text: 'test',
        email: 'test@test.com',
      });
    });

    it('should create the form correctly for the required component type', () => {
      const ctAttributes = {
        simple: {
          type: 'component',
          component: 'default.test',
          repeatable: false,
          required: true,
        },
        repeatable: {
          type: 'component',
          component: 'test.test',
          repeatable: true,
          required: true,
          min: 1,
        },
      } satisfies Schema['attributes'];

      const components = {
        'default.test': {
          isDisplayed: true,
          category: 'default',
          modelType: 'component',
          uid: 'default.test',
          apiID: 'default.test',
          modelName: 'test',
          globalId: 'default.test',
          info: {
            displayName: 'test',
          },
          attributes: {
            text: {
              type: 'text',
            },
            email: {
              type: 'email',
            },
          },
        },
        'test.test': {
          isDisplayed: true,
          category: 'test',
          modelType: 'component',
          uid: 'test.test',
          apiID: 'test.test',
          modelName: 'test',
          globalId: 'test.test',
          info: {
            displayName: 'test',
          },
          attributes: {
            text: {
              type: 'text',
              default: 'test',
            },
            email: {
              type: 'email',
            },
          },
        },
      } satisfies ComponentsDictionary;

      const expected = {
        simple: {},
        repeatable: [
          {
            text: 'test',
          },
        ],
      };
      expect(createDefaultForm({ ...contentType, attributes: ctAttributes }, components)).toEqual(
        expected
      );
    });
  });
});
