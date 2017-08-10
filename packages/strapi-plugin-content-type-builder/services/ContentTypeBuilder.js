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
    return new Promise((resolve, reject) => {
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
        },
        error: () => {
          reject();
        }
      });
    });
  },

  getModelPath: model => {
    let searchFilePath;
    const errors = [];
    const searchFileName = `${_.get(strapi.models, `${model}.globalId`) || _.upperFirst(_.camelCase(model))}.settings.json`;
    const apiPath = path.join(strapi.config.appPath, 'api');

    let apis;
    try {
      apis = fs.readdirSync(apiPath);
    } catch (e) {
      errors.push({
        id: 'request.error.folder.read',
        params: {
          folderPath: apiPath
        }
      });
    }

    _.forEach(apis, api => {
      const modelsPath = path.join(apiPath, api, 'models');

      let models;
      try {
        models = fs.readdirSync(modelsPath);
      } catch (e) {
        errors.push({
          id: 'request.error.folder.read',
          params: {
            folderPath: modelsPath
          }
        });
      }

      if (_.indexOf(models, searchFileName) !== -1) searchFilePath = `${modelsPath}/${searchFileName}`;
    });

    return [searchFilePath, errors];
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
    const errors = [];
    const apiPath = path.join(strapi.config.appPath, 'api');

    let apis;
    try {
      apis = fs.readdirSync(apiPath);
    } catch (e) {
      errors.push({
        id: 'request.error.folder.read',
        params: {
          folderPath: apiPath
        }
      });
    }

    _.forEach(apis, api => {
      const modelsPath = path.join(apiPath, api, 'models');

      let models;
      try {
        models = fs.readdirSync(modelsPath);
      } catch (e) {
        errors.push({
          id: 'request.error.folder.read',
          params: {
            folderPath: modelsPath
          }
        });
      }

      _.forEach(models, modelPath => {
        if (_.endsWith(modelPath, '.settings.json')) {
          const modelObject = strapi.models[_.lowerCase(_.first(modelPath.split('.')))];

          const relationsToDelete = _.filter(_.get(modelObject, 'associations', []), association => {
            return association[association.type] === model;
          });

          const modelFilePath = path.join(modelsPath, modelPath);

          let modelJSON;
          try {
            modelJSON = JSON.parse(require(modelFilePath));
          } catch (e) {
            errors.push({
              id: 'request.error.model.read',
              params: {
                filePath: modelFilePath
              }
            });
          }

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
        }
      });
    });

    return errors;
  },

  createRelations: (model, attributes) => {
    const errors = [];
    const apiPath = path.join(strapi.config.appPath, 'api');

    let apis;
    try {
      apis = fs.readdirSync(apiPath);
    } catch (e) {
      errors.push({
        id: 'request.error.folder.read',
        params: {
          folderPath: apiPath
        }
      });
    }

    _.forEach(apis, api => {
      const modelsPath = path.join(apiPath, api, 'models');

      let models;
      try {
        models = fs.readdirSync(modelsPath);
      } catch (e) {
        errors.push({
          id: 'request.error.folder.read',
          params: {
            folderPath: modelsPath
          }
        });
      }

      _.forEach(models, modelPath => {
        if (_.endsWith(modelPath, '.settings.json')) {
          const modelName = _.lowerCase(_.first(modelPath.split('.')));

          const relationsToCreate = _.filter(attributes, attribute => {
            return _.get(attribute, 'params.target') === modelName;
          });

          if (!_.isEmpty(relationsToCreate)) {
            const modelFilePath = path.join(modelsPath, modelPath);


            let modelJSON;
            try {
              modelJSON = JSON.parse(require(modelFilePath));
            } catch (e) {
              errors.push({
                id: 'request.error.model.read',
                params: {
                  filePath: modelFilePath
                }
              });
            }

            _.forEach(relationsToCreate, ({ name, params }) => {
              const attr = {
                via: name
              };

              switch (params.nature) {
                case 'oneToOne':
                case 'oneToMany':
                  attr.model = _.toLower(_.camelCase(model));
                  break;
                case 'manyToOne':
                case 'manyToMany':
                  attr.collection = _.toLower(_.camelCase(model));
                  break;
                default:
              }

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
          }
        }
      });
    });

    return errors;
  },

  removeModel: model => {
    const errors = [];
    const apiPath = path.join(strapi.config.appPath, 'api');

    const deleteModelFile = (parentPath, fileName) => {
      const filePath = path.join(parentPath, fileName);

      if (_.startsWith(_.toLower(fileName), model)) {
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
      let items;
      try {
        items = fs.readdirSync(folderPath);
      } catch (e) {
        errors.push({
          id: 'request.error.folder.read',
          params: {
            folderPath
          }
        });
      }

      _.forEach(items, item => {
        const itemPath = path.join(folderPath, item);

        if (fs.lstatSync(itemPath).isDirectory()) {
          recurciveDeleteFiles(itemPath);
        } else {
          deleteModelFile(folderPath, item);
        }
      });

      if (_.isEmpty(fs.readdirSync(folderPath))) {
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
    }

    recurciveDeleteFiles(apiPath);

    return errors;
  }
};
