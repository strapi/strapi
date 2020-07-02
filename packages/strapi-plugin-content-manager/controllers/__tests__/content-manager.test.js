'use strict';

const createContext = require('../../../../test/helpers/create-context');
const ContentManager = require('../ContentManager');

describe('ContentManager', () => {
  describe('findRelationList', () => {
    test('Fails on model not found', async () => {
      const notFound = jest.fn();
      const ctx = createContext(
        {
          params: { model: 'test', targetField: 'field' },
        },
        {
          notFound,
        }
      );

      const getModel = jest.fn();
      global.strapi = { db: { getModel } };

      await ContentManager.findRelationList(ctx);

      expect(notFound).toHaveBeenCalledWith('model.notFound');
    });

    test('Fails on invalid target field', async () => {
      const badRequest = jest.fn();
      const ctx = createContext(
        {
          params: { model: 'test', targetField: 'field' },
        },
        {
          badRequest,
        }
      );

      const getModel = jest.fn(() => ({
        attributes: {},
      }));

      global.strapi = { db: { getModel } };

      await ContentManager.findRelationList(ctx);

      expect(badRequest).toHaveBeenCalledWith('targetField.invalid');
    });

    test('Fails on model not found', async () => {
      const notFound = jest.fn();
      const ctx = createContext(
        {
          params: { model: 'test', targetField: 'target' },
        },
        {
          notFound,
        }
      );

      const getModelByAssoc = jest.fn();
      const getModel = jest.fn(() => ({
        attributes: { target: { model: 'test' } },
      }));
      global.strapi = { db: { getModel, getModelByAssoc } };

      await ContentManager.findRelationList(ctx);

      expect(notFound).toHaveBeenCalledWith('target.notFound');
    });

    test('Picks the mainField and primaryKey / id only', async () => {
      const notFound = jest.fn();
      const ctx = createContext(
        {
          params: { model: 'test', targetField: 'target' },
        },
        {
          notFound,
        }
      );

      const getModelByAssoc = jest.fn(() => ({ primaryKey: 'id', attributes: {} }));
      const getModel = jest.fn(() => ({ attributes: { target: { model: 'test' } } }));

      global.strapi = {
        db: {
          getModel,
          getModelByAssoc,
        },
        plugins: {
          'content-manager': {
            services: {
              contenttypes: {
                getConfiguration() {
                  return {
                    metadatas: {
                      target: {
                        edit: {
                          mainField: 'title',
                        },
                      },
                    },
                  };
                },
              },
              contentmanager: {
                fetchAll() {
                  return [
                    {
                      id: 1,
                      title: 'title1',
                      secret: 'some secret',
                    },
                    {
                      id: 2,
                      title: 'title2',
                      secret: 'some secret 2',
                    },
                  ];
                },
              },
            },
          },
        },
      };

      await ContentManager.findRelationList(ctx);

      expect(ctx.body).toEqual([
        {
          id: 1,
          title: 'title1',
        },
        {
          id: 2,
          title: 'title2',
        },
      ]);
    });
  });
});
