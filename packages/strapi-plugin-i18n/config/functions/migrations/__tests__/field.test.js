'use strict';

const { cloneDeep } = require('lodash/fp');
const { before } = require('../field');

describe('i18n - Migration - disable localization on a field', () => {
  describe('before', () => {
    describe('Should not migrate', () => {
      test("Doesn't migrate if model isn't localized", async () => {
        const find = jest.fn();
        global.strapi = {
          query: () => {
            find;
          },
        };

        const model = {
          collectionName: 'dogs',
          info: { name: 'dog' },
          attributes: {
            name: { type: 'string' },
            code: { type: 'string' },
          },
        };

        const previousDefinition = {
          collectionName: 'dogs',
          info: { name: 'dog' },
          attributes: {
            name: { type: 'string' },
          },
        };

        await before({ model, definition: model, previousDefinition });
        expect(find).not.toHaveBeenCalled();
      });

      test("Doesn't migrate if no attribute changed (without i18n)", async () => {
        const find = jest.fn();
        global.strapi = {
          query: () => {
            find;
          },
        };

        const model = {
          collectionName: 'dogs',
          info: { name: 'dog' },
          attributes: {
            name: { type: 'string' },
            code: { type: 'string' },
          },
        };

        const previousDefinition = model;

        await before({ model, definition: model, previousDefinition });
        expect(find).not.toHaveBeenCalled();
      });

      test("Doesn't migrate if no attribute changed (with i18n)", async () => {
        const find = jest.fn();
        global.strapi = {
          query: () => {
            find;
          },
        };

        const model = {
          collectionName: 'dogs',
          info: { name: 'dog' },
          pluginOptions: { i18n: { localized: true } },
          attributes: {
            name: {
              type: 'string',
              pluginOptions: { i18n: { localized: true } },
            },
            code: {
              type: 'string',
              pluginOptions: { i18n: { localized: false } },
            },
          },
        };

        const previousDefinition = model;

        await before({ model, definition: model, previousDefinition });
        expect(find).not.toHaveBeenCalled();
      });

      test("Doesn't migrate if field not localized and pluginOptions removed", async () => {
        const find = jest.fn();
        global.strapi = {
          query: () => {
            find;
          },
        };

        const model = {
          collectionName: 'dogs',
          info: { name: 'dog' },
          pluginOptions: { i18n: { localized: true } },
          attributes: {
            name: {
              type: 'string',
              pluginOptions: { i18n: { localized: false } },
            },
          },
        };

        const previousDefinition = cloneDeep(model);
        delete previousDefinition.attributes.name.pluginOptions;

        await before({ model, definition: model, previousDefinition });
        expect(find).not.toHaveBeenCalled();
      });

      test("Doesn't migrate if field becomes localized", async () => {
        const find = jest.fn();
        global.strapi = {
          query: () => {
            find;
          },
        };

        const model = {
          collectionName: 'dogs',
          info: { name: 'dog' },
          pluginOptions: { i18n: { localized: true } },
          attributes: {
            name: {
              type: 'string',
              pluginOptions: { i18n: { localized: true } },
            },
          },
        };

        const previousDefinition = cloneDeep(model);
        previousDefinition.attributes.name.pluginOptions.i18n.localized = false;

        await before({ model, definition: model, previousDefinition });
        expect(find).not.toHaveBeenCalled();
      });
    });
  });
});
