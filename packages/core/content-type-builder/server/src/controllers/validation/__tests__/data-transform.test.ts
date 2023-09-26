import { Schema } from '@strapi/types';
import { removeEmptyDefaults, removeDeletedUIDTargetFields } from '../data-transform';

describe('Data transform', () => {
  describe('removeEmptyDefaults', () => {
    test('Clears defaults', () => {
      const data = {
        attributes: {
          test: {
            default: '',
          },
        },
      } as any;

      removeEmptyDefaults(data);

      expect(data).toEqual({
        attributes: {
          test: {
            default: undefined,
          },
        },
      });
    });
  });

  describe('removeDeletedUIDTargetFields', () => {
    test('Set targetField to undefined when it doesnt exist', () => {
      const data = {
        attributes: {
          slug: {
            type: 'uid',
            targetField: 'random',
          },
        },
      } as Pick<Schema.ContentType, 'attributes'> as Schema.ContentType;

      removeDeletedUIDTargetFields(data);

      expect(data).toEqual({
        attributes: {
          slug: {
            type: 'uid',
            targetField: undefined,
          },
        },
      });
    });
  });
});
