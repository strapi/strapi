'use strict';

const { after } = require('../field');

describe('i18n - Migration - disable localization on a field', () => {
  describe('after', () => {
    describe('Should not migrate', () => {
      test("Doesn't migrate if model isn't localized", async () => {
        const find = jest.fn();
        global.strapi = {
          query: () => {
            find;
          },
          plugins: {
            i18n: {
              services: {
                'content-types': {
                  isLocalized: () => false,
                },
              },
            },
          },
        };

        const model = {};
        const previousDefinition = {};

        await after({ model, definition: model, previousDefinition });
        expect(find).not.toHaveBeenCalled();
      });

      test("Doesn't migrate if no attribute changed (without i18n)", async () => {
        const find = jest.fn();
        const getLocalizedFields = jest
          .fn()
          .mockReturnValueOnce([])
          .mockReturnValueOnce([]);

        global.strapi = {
          query: () => {
            find;
          },
          plugins: {
            i18n: {
              services: {
                'content-types': {
                  isLocalized: () => true,
                  getLocalizedFields,
                },
              },
            },
          },
        };

        const model = { attributes: { name: {} } };
        const previousDefinition = { attributes: { name: {} } };

        await after({ model, definition: model, previousDefinition });
        expect(getLocalizedFields).toHaveBeenCalledTimes(2);
        expect(find).not.toHaveBeenCalled();
      });

      test("Doesn't migrate if no attribute changed (with i18n)", async () => {
        const find = jest.fn();
        const getLocalizedFields = jest
          .fn()
          .mockReturnValueOnce(['name'])
          .mockReturnValueOnce(['name']);
        global.strapi = {
          query: () => {
            find;
          },
          plugins: {
            i18n: {
              services: {
                'content-types': {
                  isLocalized: () => true,
                  getLocalizedFields,
                },
              },
            },
          },
        };

        const model = { attributes: { name: {} } };
        const previousDefinition = { attributes: { name: {} } };

        await after({ model, definition: model, previousDefinition });
        expect(getLocalizedFields).toHaveBeenCalledTimes(2);
        expect(find).not.toHaveBeenCalled();
      });

      test("Doesn't migrate if field become localized", async () => {
        const find = jest.fn();
        const getLocalizedFields = jest
          .fn()
          .mockReturnValueOnce(['name'])
          .mockReturnValueOnce([]);

        global.strapi = {
          query: () => {
            find;
          },
          plugins: {
            i18n: {
              services: {
                'content-types': {
                  isLocalized: () => true,
                  getLocalizedFields,
                },
              },
            },
          },
        };

        const model = { attributes: { name: {} } };
        const previousDefinition = { attributes: { name: {} } };

        await after({ model, definition: model, previousDefinition });
        expect(getLocalizedFields).toHaveBeenCalledTimes(2);
        expect(find).not.toHaveBeenCalled();
      });

      test("Doesn't migrate if field is deleted", async () => {
        const find = jest.fn();
        const getLocalizedFields = jest
          .fn()
          .mockReturnValueOnce([])
          .mockReturnValueOnce(['name']);

        global.strapi = {
          query: () => {
            find;
          },
          plugins: {
            i18n: {
              services: {
                'content-types': {
                  isLocalized: () => true,
                  getLocalizedFields,
                },
              },
            },
          },
        };

        const model = { attributes: {} };
        const previousDefinition = { attributes: { name: {} } };

        await after({ model, definition: model, previousDefinition });
        expect(getLocalizedFields).toHaveBeenCalledTimes(2);
        expect(find).not.toHaveBeenCalled();
      });
    });
  });
});
