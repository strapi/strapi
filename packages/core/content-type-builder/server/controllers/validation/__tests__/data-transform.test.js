'use strict';

const { removeEmptyDefaults, removeDeletedUIDTargetFields } = require('../data-transform');

describe('Data transform', () => {
  describe('removeEmptyDefaults', () => {
    test('Clears defaults', () => {
      const data = {
        attributes: {
          test: {
            default: '',
          },
        },
      };

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
      };

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
