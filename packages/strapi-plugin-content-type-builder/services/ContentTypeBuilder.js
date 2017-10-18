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
        name: _.get(model, 'info.name', 'model.name.missing'),
        description: _.get(model, 'info.description', 'model.description.missing'),
        fields: _.keys(model.attributes).length
      });
    });

    return models;
  },

  getModel: name => {
    name = _.toLower(name);

    const model = _.get(strapi.models, name);

    const attributes = [];
    _.forEach(model.attributes, (params, name) => {
      const relation = _.find(model.associations, { alias: name });

      if (relation) {
        params = _.omit(params, ['collection', 'model', 'via']);
        params.target = relation.model || relation.collection;
        params.key = relation.via;
        params.nature = relation.nature;
        params.targetColumnName = _.get(strapi.models[params.target].attributes[params.key], 'columnName', '');
      }

      attributes.push({
        name,
        params
      });
    });

    return {
      name: _.get(model, 'info.name', 'model.name.missing'),
      description: _.get(model, 'info.description', 'model.description.missing'),
      connection: model.connection,
      collectionName: model.collectionName,
      attributes: attributes
    };
  },

  getConnections: () => {
    return _.keys(strapi.config.currentEnvironment.database.connections);
  },

  generateAPI: (name, description, connection, collectionName, attributes) => {
    return new Promise((resolve, reject) => {
      const scope = {
        generatorType: 'api',
        id: name,
        rootPath: strapi.config.appPath,
        args: {
          api: name,
          description,
          attributes,
          connection,
          collectionName: !_.isEmpty(collectionName) ? collectionName : undefined
        }
      };

      generator(scope, {
        success: () => {
          resolve();
        },
        error: () => {
          reject();
        }
      });
    });
  },

  getModelPath: model => {
    model = _.toLower(model);

    let searchFilePath;
    const errors = [];
    const searchFileName = `${model}.settings.json`;
    const apiPath = path.join(strapi.config.appPath, 'api');

    try {
      const apis = fs.readdirSync(apiPath).filter(x => x[0] !== '.');

      _.forEach(apis, api => {
        const modelsPath = path.join(apiPath, api, 'models');

        try {
          const models = fs.readdirSync(modelsPath).filter(x => x[0] !== '.');

          const modelIndex = _.indexOf(_.map(models, model => _.toLower(model)), searchFileName);

          if (modelIndex !== -1) searchFilePath = `${modelsPath}/${models[modelIndex]}`;
        } catch (e) {
          errors.push({
            id: 'request.error.folder.read',
            params: {
              folderPath: modelsPath
            }
          });
        }
      });
    } catch (e) {
      errors.push({
        id: 'request.error.folder.read',
        params: {
          folderPath: apiPath
        }
      });
    }

    return [searchFilePath, errors];
  },

  formatAttributes: attributes => {
    const errors = [];
    const attrs = {};

    _.forEach(attributes, attribute => {
      if (_.has(attribute, 'params.type')) {
        attrs[attribute.name] = attribute.params;
      } else if (_.has(attribute, 'params.target')) {
        const relation = attribute.params;
        const attr = {
          required: relation.required,
          columnName: relation.columnName,
          unique: relation.unique
        };

        switch (relation.nature) {
          case 'oneToOne':
          case 'manyToOne':
            attr.model = relation.target;
            break;
          case 'manyToMany':
          case 'oneToMany':
            attr.collection = relation.target;
            break;
          default:
        }

        attr.via = relation.key;
        attr.dominant = relation.dominant;

        attrs[attribute.name] = attr;
      }

      if (!_.isNaN(parseFloat(attribute.name[0])) || !_.isNaN(parseFloat(_.get(attribute, 'params.key'), NaN))) {
        errors.push({
          id: 'request.error.attribute.values',
          params: {
            attribute
          }
        });
      }
    });

    return [attrs, errors];
  },

  clearRelations: model => {
    model = _.toLower(model);

    const errors = [];
    const apiPath = path.join(strapi.config.appPath, 'api');

    try {
      const apis = fs.readdirSync(apiPath).filter(x => x[0] !== '.');

      _.forEach(apis, api => {
        const modelsPath = path.join(apiPath, api, 'models');

        try {
          const models = fs.readdirSync(modelsPath).filter(x => x[0] !== '.');

          _.forEach(models, modelPath => {
            if (_.endsWith(modelPath, '.settings.json')) {
              const modelObject = strapi.models[_.lowerCase(_.first(modelPath.split('.')))];

              const relationsToDelete = _.filter(_.get(modelObject, 'associations', []), association => {
                return association[association.type] === model;
              });

              const modelFilePath = path.join(modelsPath, modelPath);

              try {
                const modelJSON = require(modelFilePath);

                _.forEach(relationsToDelete, relation => {
                  modelJSON.attributes[relation.alias] = undefined;
                });

                try {
                  fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');
                } catch (e) {
                  errors.push({
                    id: 'request.error.model.write',
                    params: {
                      filePath: modelFilePath
                    }
                  });
                }
              } catch (e) {
                errors.push({
                  id: 'request.error.model.read',
                  params: {
                    filePath: modelFilePath
                  }
                });
              }
            }
          });
        } catch (e) {
          errors.push({
            id: 'request.error.folder.read',
            params: {
              folderPath: modelsPath
            }
          });
        }
      });
    } catch (e) {
      errors.push({
        id: 'request.error.folder.read',
        params: {
          folderPath: apiPath
        }
      });
    }

    return errors;
  },

  createRelations: (model, attributes) => {
    model = _.toLower(model);

    const errors = [];
    const apiPath = path.join(strapi.config.appPath, 'api');

    try {
      const apis = fs.readdirSync(apiPath).filter(x => x[0] !== '.');

      _.forEach(apis, api => {
        const modelsPath = path.join(apiPath, api, 'models');

        try {
          const models = fs.readdirSync(modelsPath).filter(x => x[0] !== '.');

          _.forEach(models, modelPath => {
            if (_.endsWith(modelPath, '.settings.json')) {
              const modelName = _.lowerCase(_.first(modelPath.split('.')));

              const relationsToCreate = _.filter(attributes, attribute => {
                return _.get(attribute, 'params.target') === modelName;
              });

              if (!_.isEmpty(relationsToCreate)) {
                const modelFilePath = path.join(modelsPath, modelPath);

                try {
                  const modelJSON = require(modelFilePath);

                  _.forEach(relationsToCreate, ({ name, params }) => {
                    const attr = {
                      columnName: params.targetColumnName,
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

                    attr.via = name;

                    modelJSON.attributes[params.key] = attr;

                    try {
                      fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');
                    } catch (e) {
                      errors.push({
                        id: 'request.error.model.write',
                        params: {
                          filePath: modelFilePath
                        }
                      });
                    }
                  });
                } catch (e) {
                  errors.push({
                    id: 'request.error.model.read',
                    params: {
                      filePath: modelFilePath
                    }
                  });
                }
              }
            }
          });
        } catch (e) {
          errors.push({
            id: 'request.error.folder.read',
            params: {
              folderPath: modelsPath
            }
          });
        }
      });
    } catch (e) {
      errors.push({
        id: 'request.error.folder.read',
        params: {
          folderPath: apiPath
        }
      });
    }

    return errors;
  },

  removeModel: model => {
    model = _.toLower(model);

    const errors = [];
    const apiPath = path.join(strapi.config.appPath, 'api');

    const deleteModelFile = (parentPath, fileName) => {
      const filePath = path.join(parentPath, fileName);

      if (_.startsWith(`${_.toLower(fileName)}.`, `${model}.`)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          errors.push({
            id: 'request.error.file.unlink',
            params: {
              filePath
            }
          });
        }
      }

      if (fileName === 'routes.json') {
        const routesJSON = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        _.remove(routesJSON.routes, function(route) {
          return _.startsWith(_.toLower(route.handler), model);
        });

        if (_.isEmpty(routesJSON.routes)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            errors.push({
              id: 'request.error.route.unlink',
              params: {
                filePath
              }
            });
          }
        } else {
          try {
            fs.writeFileSync(filePath, JSON.stringify(routesJSON, null, 2), 'utf8');
          } catch (e) {
            errors.push({
              id: 'request.error.route.write',
              params: {
                filePath
              }
            });
          }
        }
      }
    }

    const recurciveDeleteFiles = folderPath => {
      try {
        const items = fs.readdirSync(folderPath).filter(x => x[0] !== '.');

        _.forEach(items, item => {
          const itemPath = path.join(folderPath, item);

          if (fs.lstatSync(itemPath).isDirectory()) {
            recurciveDeleteFiles(itemPath);
          } else {
            deleteModelFile(folderPath, item);
          }
        });

        if (_.isEmpty(fs.readdirSync(folderPath).filter(x => x[0] !== '.'))) {
          try {
            fs.rmdirSync(folderPath);
          } catch (e) {
            errors.push({
              id: 'request.error.folder.unlink',
              params: {
                folderPath
              }
            });
          }
        }
      } catch (e) {
        errors.push({
          id: 'request.error.folder.read',
          params: {
            folderPath
          }
        });
      }
    }

    recurciveDeleteFiles(apiPath);

    return errors;
  }
};
