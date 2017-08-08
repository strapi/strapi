'use strict';

const path = require('path')
const fs = require('fs')
const _ = require('lodash');
const generator = require('strapi-generate');

module.exports = {
  getModels: () => {
    const models = [];

    _.forEach(strapi.models, (model, name) => {
      models.push({
        icon: 'fa-cube',
        name,
        description: _.get(model, 'description', 'model.description.missing'),
        fields: _.keys(model.attributes).length
      });
    });

    return models;
  },

  getModel: slug => {
    const model = _.get(strapi.models, slug);

    const attributes = [];
    _.forEach(model.attributes, (params, name) => {
      const relation = _.find(model.associations, { alias: name });

      if (relation) {
        params = {
          target: relation.model || relation.collection,
          key: relation.via,
          nature: relation.nature
        }
      }

      attributes.push({
        name,
        params
      });
    });

    return {
      name: slug,
      description: _.get(model, 'description', 'model.description.missing'),
      attributes: attributes
    };
  },

  generateAPI: (name, attributes) => {
    return new Promise(function(resolve, reject) {
      const scope = {
        generatorType: 'api',
        id: name,
        rootPath: strapi.config.appPath,
        args: {
          api: name,
          attributes
        }
      }

      generator(scope, {
        success: () => {
          resolve();
        }
      });
    });
  },

  getModelPath: model => {
    let searchFilePath;
    const searchFileName = `${_.get(strapi.models, `${model}.globalId`) || _.capitalize(model)}.settings.json`;
    const apiPath = path.join(strapi.config.appPath, 'api');
    const apis = fs.readdirSync(apiPath);

    _.forEach(apis, api => {
      const modelsPath = path.join(apiPath, api, 'models');
      const models = fs.readdirSync(modelsPath);

      if (_.indexOf(models, searchFileName) !== -1) searchFilePath = `${modelsPath}/${searchFileName}`;
    });

    return searchFilePath;
  },

  formatAttributes: attributes => {
    const attrs = {};

    _.forEach(attributes, attribute => {
      if (_.has(attribute, 'params.type')) {
        attrs[attribute.name] = _.get(attribute, 'params');
      } else if (_.has(attribute, 'params.target')) {
        const relation = _.get(attribute, 'params');
        const attr = {
          via: relation.key
        };

        switch (relation.nature) {
          case 'oneToOne':
          case 'manyToOne':
            attr.model = relation.target;
            break;
          case 'oneToMany':
          case 'manyToMany':
            attr.collection = relation.target;
            break;
          default:
        }

        attrs[attribute.name] = attr;
      }
    });

    return attrs;
  },

  clearRelations: model => {
    const apiPath = path.join(strapi.config.appPath, 'api');
    const apis = fs.readdirSync(apiPath);

    _.forEach(apis, api => {
      const modelsPath = path.join(apiPath, api, 'models');
      const models = fs.readdirSync(modelsPath);

      _.forEach(models, modelPath => {
        if (_.endsWith(modelPath, '.settings.json')) {
          const modelObject = strapi.models[_.lowerCase(_.first(modelPath.split('.')))];

          const relationsToDelete = _.filter(_.get(modelObject, 'associations', []), association => {
            return association[association.type] === model;
          });

          const modelFilePath = path.join(modelsPath, modelPath);
          const modelJSON = JSON.parse(fs.readFileSync(modelFilePath, 'utf8'));

          _.forEach(relationsToDelete, relation => {
            modelJSON.attributes[relation.alias] = undefined;
          });

          fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');
        }
      });
    });
  },

  createRelations: (model, attributes) => {
    const apiPath = path.join(strapi.config.appPath, 'api');
    const apis = fs.readdirSync(apiPath);

    _.forEach(apis, api => {
      const modelsPath = path.join(apiPath, api, 'models');
      const models = fs.readdirSync(modelsPath);

      _.forEach(models, modelPath => {
        if (_.endsWith(modelPath, '.settings.json')) {
          const modelName = _.lowerCase(_.first(modelPath.split('.')));

          const relationsToCreate = _.filter(attributes, attribute => {
            return _.get(attribute, 'params.target') === modelName;
          });

          if (!_.isEmpty(relationsToCreate)) {
            const modelFilePath = path.join(modelsPath, modelPath);
            const modelJSON = JSON.parse(fs.readFileSync(modelFilePath, 'utf8'));

            _.forEach(relationsToCreate, ({ name, params }) => {
              const attr = {
                via: name
              };

              switch (params.nature) {
                case 'oneToOne':
                case 'oneToMany':
                  attr.model = model;
                  break;
                case 'manyToOne':
                case 'manyToMany':
                  attr.collection = model;
                  break;
                default:
              }

              modelJSON.attributes[params.key] = attr;

              fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');
            });
          }
        }
      });
    });
  }
};
