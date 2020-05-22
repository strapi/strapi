const { getNature } = require('../models');

describe('getNature', () => {
  describe('oneWay', () => {
    test('oneWay', () => {
      global.strapi = {
        models: {
          baseModel: {
            attributes: {
              test: {
                model: 'modelName',
              },
            },
          },
          modelName: {},
        },
        plugins: {},
      };

      const nature = getNature({
        attribute: global.strapi.models.baseModel.attributes.test,
        attributeName: 'test',
        modelName: 'baseModel',
      });

      expect(nature).toEqual({
        nature: 'oneWay',
        verbose: 'belongsTo',
      });
    });
  });

  describe('oneToOne', () => {
    test('oneToOne', () => {
      global.strapi = {
        models: {
          baseModel: {
            attributes: {
              test: {
                model: 'modelName',
                via: 'reverseAttribute',
              },
            },
          },
          modelName: {
            attributes: {
              reverseAttribute: {
                model: 'baseModel',
              },
            },
          },
        },
        plugins: {},
      };

      const nature = getNature({
        attribute: global.strapi.models.baseModel.attributes.test,
        attributeName: 'test',
        modelName: 'baseModel',
      });

      expect(nature).toEqual({
        nature: 'oneToOne',
        verbose: 'belongsTo',
      });
    });
  });
});
