'use strict';

const { isLocalized, getNonLocalizedFields } = require('../content-types');

describe('content-types service', () => {
  describe('isLocalized', () => {
    test('Checks for the i18N option', () => {
      expect(isLocalized({ pluginOptions: { i18n: { localized: false } } })).toBe(false);
      expect(isLocalized({ pluginOptions: { i18n: { localized: true } } })).toBe(true);
    });

    test('Defaults to false', () => {
      expect(isLocalized({})).toBe(false);
      expect(isLocalized({ pluginOptions: {} })).toBe(false);
      expect(isLocalized({ pluginOptions: { i18n: {} } })).toBe(false);
    });
  });

  describe('getNonLocalizedFields', () => {
    test('Uses the pluginOptions to detect non localized fields', () => {
      expect(
        getNonLocalizedFields({
          uid: 'test-model',
          attributes: {
            title: {
              type: 'string',
              pluginOptions: {
                i18n: {
                  localized: true,
                },
              },
            },
            stars: {
              type: 'interger',
            },
            price: {
              type: 'interger',
            },
          },
        })
      ).toEqual(['stars', 'price']);
    });

    test('Consider relations to be always localized', () => {
      expect(
        getNonLocalizedFields({
          uid: 'test-model',
          attributes: {
            title: {
              type: 'string',
              pluginOptions: {
                i18n: {
                  localized: true,
                },
              },
            },
            stars: {
              type: 'interger',
            },
            price: {
              type: 'interger',
            },
            relation: {
              model: 'user',
            },
            secondRelation: {
              collection: 'user',
            },
          },
        })
      ).toEqual(['stars', 'price']);
    });
  });
});
