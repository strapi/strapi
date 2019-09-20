'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const generator = require('strapi-generate');
const { deepTrimObject } = require('../utils/helpers.js');

function formatModelInfos(model, plugin) {
  const data = {
    icon: 'fa-cube',
    name: _.get(model, 'info.name', 'model.name.missing'),
    description: _.get(model, 'info.description', 'model.description.missing'),
    fields: _.keys(model.attributes).length,
    isTemporary: false,
  };

  if (plugin) {
    data.source = plugin;
  }

  return data;
}

module.exports = {
  /**
   * Returns a list of user and plugins models
   */
  getModels() {
    const models = Object.keys(strapi.models)
      .filter(key => key !== 'core_store')
      .map(name => formatModelInfos(strapi.models[name]));

    const pluginModels = Object.keys(strapi.plugins)
      .map(pluginKey => {
        const plugin = strapi.plugins[pluginKey];
        return Object.keys(plugin.models)
          .filter(key => key !== 'file')
          .map(name => formatModelInfos(plugin.models[name], pluginKey));
      })
      .reduce((acc, models) => acc.concat(models), []);

    return models.concat(pluginModels);
  },

  /**
   * Returns a model info
   */
  async getModel(name, source) {
    name = _.toLower(name);

    const model = source
      ? _.get(strapi.plugins, [source, 'models', name])
      : _.get(strapi.models, name);

    const attributes = [];
    _.forEach(model.attributes, (params, attr) => {
      const relation = _.find(model.associations, { alias: attr });

      if (relation && !_.isArray(_.get(relation, relation.alias))) {
        if (
          (params.plugin === 'upload' && relation.model) ||
          relation.collection === 'file'
        ) {
          params = {
            type: 'media',
            multiple: params.collection ? true : false,
            required: params.required,
            configurable: params.configurable,
          };
        } else {
          params = _.omit(params, ['collection', 'model', 'via']);
          params.target = relation.model || relation.collection;
          params.key = relation.via;
          params.nature = relation.nature;
          params.targetColumnName = _.get(
            (params.plugin
              ? strapi.plugins[params.plugin].models
              : strapi.models)[params.target].attributes[params.key],
            'columnName',
            ''
          );
        }
      }

      attributes.push({
        name: attr,
        params,
      });
    });

    return {
      name: _.get(model, 'info.name', 'model.name.missing'),
      description: _.get(
        model,
        'info.description',
        'model.description.missing'
      ),
      mainField: _.get(model, 'info.mainField', ''),
      connection: model.connection,
      collectionName: model.collectionName,
      attributes: attributes,
    };
  },

  generateAPI(name, description, connection, collectionName, attributes) {
    const template = _.get(
      strapi.config.currentEnvironment,
      `database.connections.${connection}.connector`,
      'strapi-connector-mongoose'
    ).split('-')[2];

    return new Promise((resolve, reject) => {
      const scope = {
        generatorType: 'api',
        id: name.toLowerCase(),
        rootPath: strapi.config.appPath,
        args: {
          api: name,
          description: _.replace(description, /\"/g, '\\"'), // eslint-disable-line no-useless-escape
          attributes,
          connection,
          collectionName: !_.isEmpty(collectionName)
            ? collectionName
            : undefined,
          tpl: template,
        },
      };

      generator(scope, {
        success: () => {
          resolve();
        },
        error: err => {
          reject(err);
        },
      });
    });
  },

  writeModel(name, data, { api, plugin, group } = {}) {
    const filepath = this.getModelPath(name, { api, plugin, group });
    const content = JSON.stringify(data, null, 2);

    fs.ensureFileSync(filepath);
    return fs.writeFileSync(filepath, content);
  },

  readModel(name, { api, plugin, group } = {}) {
    const filepath = this.getModelPath(name, { api, plugin, group });

    if (plugin && !fs.pathExistsSync(filepath)) {
      return _.cloneDeep(
        _.pick(strapi.plugins[plugin].models[name], [
          'collectionName',
          'connection',
          'info',
          'options',
          'attributes',
        ])
      );
    }

    delete require.cache[filepath];
    return _.cloneDeep(require(filepath));
  },

  getModelPath(name, { api, plugin, group } = {}) {
    const fileName = `${_.upperFirst(name)}.settings.json`;

    if (plugin) {
      return path.resolve(
        strapi.config.appPath,
        'extensions',
        plugin,
        'models',
        fileName
      );
    } else if (api) {
      return path.resolve(
        strapi.config.appPath,
        'api',
        api,
        'models',
        fileName
      );
    } else if (group) {
      return path.resolve(strapi.config.appPath, 'groups', `${name}.json`);
    }

    throw new Error('Expected an api or a plugin, received none');
  },

  formatAttributes(attributes, name, plugin) {
    const errors = [];
    const attrs = {};

    const target =
      Object.keys((plugin ? strapi.plugins : strapi.api) || {}).filter(x =>
        _.includes(
          Object.keys(
            _.get((plugin ? strapi.plugins : strapi.api)[x], 'models', [])
          ),
          name
        )
      )[0] || name.toLowerCase();

    const model =
      (plugin
        ? _.get(strapi.plugins, [target, 'models', name])
        : _.get(strapi.api, [target, 'models', name])) || {};

    // Only select configurable attributes.
    const attributesConfigurable = attributes.filter(
      attribute =>
        _.get(model, ['attributes', attribute.name, 'configurable'], true) !==
        false
    );

    const attributesNotConfigurable = Object.keys(model.attributes || {})
      .filter(
        attribute =>
          _.get(model, ['attributes', attribute, 'configurable'], true) ===
          false
      )
      .reduce((acc, attribute) => {
        acc[attribute] = model.attributes[attribute];

        return acc;
      }, {});

    _.forEach(attributesConfigurable, attribute => {
      if (_.has(attribute, 'params.type')) {
        attrs[attribute.name] = _.omit(attribute.params, 'multiple');

        if (attribute.params.type === 'media') {
          const via = _.findKey(strapi.plugins.upload.models.file.attributes, {
            collection: '*',
          });

          attrs[attribute.name] = {
            [attribute.params.multiple ? 'collection' : 'model']: 'file',
            via,
            plugin: 'upload',
          };

          if (attribute.params.required === true) {
            attrs[attribute.name].required = true;
          }
        }
      } else if (_.has(attribute, 'params.target')) {
        const relation = attribute.params;
        const attr = {
          required: relation.required,
          columnName: relation.columnName,
          unique: relation.unique,
        };

        switch (relation.nature) {
          case 'oneWay':
          case 'oneToOne':
          case 'manyToOne':
            attr.model = relation.target;
            break;
          case 'manyWay':
          case 'manyToMany':
          case 'oneToMany':
            attr.collection = relation.target;
            break;
          default:
        }

        if (!['manyWay', 'oneWay'].includes(relation.nature)) {
          attr.via = relation.key;
        }
        attr.dominant = relation.dominant;

        if (_.trim(relation.pluginValue)) {
          attr.plugin = _.trim(relation.pluginValue);
        }

        attrs[attribute.name] = attr;
      }

      if (
        !_.isNaN(parseFloat(attribute.name[0])) ||
        !_.isNaN(parseFloat(_.get(attribute, 'params.key'), NaN))
      ) {
        errors.push({
          id: 'request.error.attribute.values',
          params: {
            attribute,
          },
        });
      }
    });

    Object.assign(attributesNotConfigurable, attrs);
    const trimmedNotConfigurableAttributes = deepTrimObject(
      attributesNotConfigurable
    );

    return [trimmedNotConfigurableAttributes, errors];
  },

  getConnections() {
    return _.keys(strapi.config.currentEnvironment.database.connections);
  },

  // TODO: add groups
  clearRelations(model, source) {
    const errors = [];

    // Method to delete the association of the models.
    const deleteAssociations = (models, { plugin, group = false } = {}) => {
      Object.keys(models).forEach(name => {
        const modelData = models[name];
        const { associations = [] } = modelData;

        const relationsToDelete = associations.filter(association => {
          const target = association.model || association.collection;

          if (source) {
            return target === model && association.plugin === source;
          }

          return target === model;
        });

        if (relationsToDelete.length > 0) {
          const opts = {
            group,
            plugin,
            api: modelData.apiName,
          };

          const modelJSON = this.readModel(name, opts);

          relationsToDelete.forEach(relation => {
            modelJSON.attributes[relation.alias] = undefined;
          });

          try {
            this.writeModel(name, modelJSON, opts);
          } catch (e) {
            strapi.log.error(e);
            errors.push({
              id: 'request.error.model.write',
            });
          }
        }
      });
    };

    deleteAssociations(strapi.models);

    Object.keys(strapi.plugins).forEach(name => {
      deleteAssociations(strapi.plugins[name].models, { plugin: name });
    });

    // update groups
    deleteAssociations(strapi.groups, { group: true });

    return errors;
  },

  createRelations(modelName, { attributes, source, oldName }) {
    const errors = [];

    // Method to update the model
    const update = (models, { plugin, group } = {}) => {
      Object.keys(models).forEach(name => {
        const modelData = models[name];
        const { associations = [] } = modelData;

        // update oneWays and manyWays that point to the model
        const unidirectionnalRelationsToCreate = associations.filter(
          association => {
            const target = association.model || association.collection;

            if (!['oneWay', 'manyWay'].includes(association.nature)) {
              return false;
            }

            if (source) {
              return target === oldName && association.plugin === source;
            }

            return target === oldName;
          }
        );

        const relationsToCreate = attributes.filter(attribute => {
          if (plugin) {
            return (
              _.get(attribute, 'params.target') === name &&
              _.get(attribute, 'params.pluginValue') === plugin
            );
          }

          return (
            _.get(attribute, 'params.target') === name &&
            _.isEmpty(_.get(attribute, 'params.pluginValue', ''))
          );
        });

        if (
          relationsToCreate.length > 0 ||
          unidirectionnalRelationsToCreate.length > 0
        ) {
          const opts = {
            group,
            plugin,
            api: modelData.apiName,
          };

          const modelJSON = this.readModel(name, opts);

          unidirectionnalRelationsToCreate.forEach(association => {
            let attr = {};

            switch (association.nature) {
              case 'manyWay':
                attr.collection = modelName.toLowerCase();
                break;
              case 'oneWay':
                attr.model = modelName.toLowerCase();
                break;
            }

            if (_.trim(source)) {
              attr.plugin = _.trim(source);
            }

            modelJSON.attributes[association.alias] = attr;
          });

          relationsToCreate.forEach(({ name, params }) => {
            const attr = {};

            switch (params.nature) {
              case 'manyWay':
              case 'oneWay':
                return;
              case 'oneToOne':
              case 'oneToMany':
                attr.model = modelName.toLowerCase();
                break;
              case 'manyToOne':
                attr.collection = modelName.toLowerCase();
                break;
              case 'manyToMany': {
                attr.collection = modelName.toLowerCase();

                if (!params.dominant) {
                  attr.dominant = true;
                }
                break;
              }
              default:
            }

            attr.via = name;
            attr.columnName = params.targetColumnName;

            if (_.trim(source)) {
              attr.plugin = _.trim(source);
            }

            modelJSON.attributes[params.key] = attr;
          });

          try {
            this.writeModel(name, modelJSON, opts);
          } catch (e) {
            strapi.log.error(e);
            errors.push({
              id: 'request.error.model.write',
            });
          }
        }
      });
    };

    // Update `./api` models.
    update(strapi.models);

    Object.keys(strapi.plugins).forEach(pluginName => {
      // Update `./plugins/${pluginName}` models.
      if (!strapi.plugins[pluginName].models) return;
      update(strapi.plugins[pluginName].models, { plugin: pluginName });
    });

    update(strapi.groups, { group: true });

    return errors;
  },

  removeModel: model => {
    const modelName = _.toLower(model);
    const apiName = strapi.models[modelName].apiName;
    const apiPath = path.join(strapi.config.appPath, 'api', apiName);

    const errors = [];

    const deleteModelFile = (parentPath, fileName) => {
      const filePath = path.join(parentPath, fileName);

      if (_.startsWith(`${_.toLower(fileName)}.`, `${model}.`)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          errors.push({
            id: 'request.error.file.unlink',
            params: {
              filePath,
            },
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
                filePath,
              },
            });
          }
        } else {
          try {
            fs.writeFileSync(
              filePath,
              JSON.stringify(routesJSON, null, 2),
              'utf8'
            );
          } catch (e) {
            errors.push({
              id: 'request.error.route.write',
              params: {
                filePath,
              },
            });
          }
        }
      }
    };

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
                folderPath,
              },
            });
          }
        }
      } catch (e) {
        errors.push({
          id: 'request.error.folder.read',
          params: {
            folderPath,
          },
        });
      }
    };

    recurciveDeleteFiles(apiPath);

    return errors;
  },
};
