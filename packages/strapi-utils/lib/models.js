'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const pluralize = require('pluralize');

// Following this discussion https://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric this function is the best implem to determine if a value is a valid number candidate
const isNumeric = value => {
  return !_.isObject(value) && !isNaN(parseFloat(value)) && isFinite(value);
};

/* eslint-disable prefer-template */
/*
 * Set of utils for models
 */
module.exports = {
  /**
   * Initialize to prevent some mistakes
   */

  initialize: cb => {
    cb();
  },

  /**
   * Retrieve the value based on the primary key
   */

  getValuePrimaryKey: (value, defaultKey) => {
    return value[defaultKey] || value.id || value._id;
  },

  /**
   * Find relation nature with verbose
   */

  getNature: (association, key, models, currentModelName) => {
    try {
      const types = {
        current: '',
        other: '',
      };

      if (_.isUndefined(models)) {
        models = association.plugin
          ? strapi.plugins[association.plugin].models
          : strapi.models;
      }

      if (
        (_.has(association, 'collection') && association.collection === '*') ||
        (_.has(association, 'model') && association.model === '*')
      ) {
        if (association.model) {
          types.current = 'morphToD';
        } else {
          types.current = 'morphTo';
        }

        const flattenedPluginsModels = Object.keys(strapi.plugins).reduce(
          (acc, current) => {
            Object.keys(strapi.plugins[current].models).forEach(model => {
              acc[`${current}_${model}`] =
                strapi.plugins[current].models[model];
            });

            return acc;
          },
          {}
        );

        const allModels = _.merge({}, strapi.models, flattenedPluginsModels);

        // We have to find if they are a model linked to this key
        _.forIn(allModels, model => {
          _.forIn(model.attributes, attribute => {
            if (
              _.has(attribute, 'via') &&
              attribute.via === key &&
              attribute.model === currentModelName
            ) {
              if (_.has(attribute, 'collection')) {
                types.other = 'collection';

                // Break loop
                return false;
              } else if (_.has(attribute, 'model')) {
                types.other = 'model';

                // Break loop
                return false;
              }
            }
          });
        });
      } else if (
        _.has(association, 'via') &&
        _.has(association, 'collection')
      ) {
        const relatedAttribute =
          models[association.collection].attributes[association.via];

        if (!relatedAttribute) {
          throw new Error(
            `The attribute \`${
              association.via
            }\` is missing in the model ${_.upperFirst(
              association.collection
            )} ${
              association.plugin ? '(plugin - ' + association.plugin + ')' : ''
            }`
          );
        }

        types.current = 'collection';

        if (
          _.has(relatedAttribute, 'collection') &&
          relatedAttribute.collection !== '*' &&
          _.has(relatedAttribute, 'via')
        ) {
          types.other = 'collection';
        } else if (
          _.has(relatedAttribute, 'collection') &&
          relatedAttribute.collection !== '*' &&
          !_.has(relatedAttribute, 'via')
        ) {
          types.other = 'collectionD';
        } else if (
          _.has(relatedAttribute, 'model') &&
          relatedAttribute.model !== '*'
        ) {
          types.other = 'model';
        } else if (
          _.has(relatedAttribute, 'collection') ||
          _.has(relatedAttribute, 'model')
        ) {
          types.other = 'morphTo';
        }
      } else if (_.has(association, 'via') && _.has(association, 'model')) {
        types.current = 'modelD';

        // We have to find if they are a model linked to this key
        const model = models[association.model];
        const attribute = model.attributes[association.via];

        if (
          _.has(attribute, 'via') &&
          attribute.via === key &&
          _.has(attribute, 'collection') &&
          attribute.collection !== '*'
        ) {
          types.other = 'collection';
        } else if (_.has(attribute, 'model') && attribute.model !== '*') {
          types.other = 'model';
        } else if (
          _.has(attribute, 'collection') ||
          _.has(attribute, 'model')
        ) {
          types.other = 'morphTo';
        }
      } else if (_.has(association, 'model')) {
        types.current = 'model';

        // We have to find if they are a model linked to this key
        _.forIn(models, model => {
          _.forIn(model.attributes, attribute => {
            if (_.has(attribute, 'via') && attribute.via === key) {
              if (
                _.has(attribute, 'collection') &&
                attribute.collection === currentModelName
              ) {
                types.other = 'collection';

                // Break loop
                return false;
              } else if (
                _.has(attribute, 'model') &&
                attribute.model === currentModelName
              ) {
                types.other = 'modelD';

                // Break loop
                return false;
              }
            }
          });
        });
      } else if (_.has(association, 'collection')) {
        types.current = 'collectionD';

        // We have to find if they are a model linked to this key
        _.forIn(models, model => {
          _.forIn(model.attributes, attribute => {
            if (_.has(attribute, 'via') && attribute.via === key) {
              if (
                _.has(attribute, 'collection') &&
                attribute.collection === currentModelName
              ) {
                types.other = 'collection';

                // Break loop
                return false;
              } else if (
                _.has(attribute, 'model') &&
                attribute.model === currentModelName
              ) {
                types.other = 'modelD';

                // Break loop
                return false;
              }
            }
          });
        });
      }

      if (types.current === 'collection' && types.other === 'morphTo') {
        return {
          nature: 'manyToManyMorph',
          verbose: 'morphMany',
        };
      } else if (types.current === 'collection' && types.other === 'morphToD') {
        return {
          nature: 'manyToOneMorph',
          verbose: 'morphMany',
        };
      } else if (types.current === 'modelD' && types.other === 'morphTo') {
        return {
          nature: 'oneToManyMorph',
          verbose: 'morphOne',
        };
      } else if (types.current === 'modelD' && types.other === 'morphToD') {
        return {
          nature: 'oneToOneMorph',
          verbose: 'morphOne',
        };
      } else if (types.current === 'morphToD' && types.other === 'collection') {
        return {
          nature: 'oneMorphToMany',
          verbose: 'belongsToMorph',
        };
      } else if (types.current === 'morphToD' && types.other === 'model') {
        return {
          nature: 'oneMorphToOne',
          verbose: 'belongsToMorph',
        };
      } else if (
        types.current === 'morphTo' &&
        (types.other === 'model' || _.has(association, 'model'))
      ) {
        return {
          nature: 'manyMorphToOne',
          verbose: 'belongsToManyMorph',
        };
      } else if (
        types.current === 'morphTo' &&
        (types.other === 'collection' || _.has(association, 'collection'))
      ) {
        return {
          nature: 'manyMorphToMany',
          verbose: 'belongsToManyMorph',
        };
      } else if (types.current === 'modelD' && types.other === 'model') {
        return {
          nature: 'oneToOne',
          verbose: 'belongsTo',
        };
      } else if (types.current === 'model' && types.other === 'modelD') {
        return {
          nature: 'oneToOne',
          verbose: 'hasOne',
        };
      } else if (
        (types.current === 'model' || types.current === 'modelD') &&
        types.other === 'collection'
      ) {
        return {
          nature: 'manyToOne',
          verbose: 'belongsTo',
        };
      } else if (types.current === 'modelD' && types.other === 'collection') {
        return {
          nature: 'oneToMany',
          verbose: 'hasMany',
        };
      } else if (types.current === 'collection' && types.other === 'model') {
        return {
          nature: 'oneToMany',
          verbose: 'hasMany',
        };
      } else if (
        types.current === 'collection' &&
        types.other === 'collection'
      ) {
        return {
          nature: 'manyToMany',
          verbose: 'belongsToMany',
        };
      } else if (
        (types.current === 'collectionD' && types.other === 'collection') ||
        (types.current === 'collection' && types.other === 'collectionD')
      ) {
        return {
          nature: 'manyToMany',
          verbose: 'belongsToMany',
        };
      } else if (types.current === 'collectionD' && types.other === '') {
        return {
          nature: 'manyWay',
          verbose: 'belongsToMany',
        };
      } else if (types.current === 'model' && types.other === '') {
        return {
          nature: 'oneWay',
          verbose: 'belongsTo',
        };
      }

      return undefined;
    } catch (e) {
      strapi.log.error(
        `Something went wrong in the model \`${_.upperFirst(
          currentModelName
        )}\` with the attribute \`${key}\``
      );
      strapi.log.error(e);
      strapi.stop();
    }
  },

  /**
   * Return table name for a collection many-to-many
   */
  getCollectionName: (associationA, associationB) => {
    return [associationA, associationB]
      .sort((a, b) => {
        if (a.collection === b.collection) {
          if (a.dominant) return 1;
          else return -1;
        }
        return a.collection < b.collection ? -1 : 1;
      })
      .map(table =>
        _.snakeCase(
          `${pluralize.plural(table.collection)} ${pluralize.plural(table.via)}`
        )
      )
      .join('__');
  },

  /**
   * Define associations key to models
   */

  defineAssociations: function(model, definition, association, key) {
    try {
      // Initialize associations object
      if (definition.associations === undefined) {
        definition.associations = [];
      }

      // Exclude non-relational attribute
      if (!_.has(association, 'collection') && !_.has(association, 'model')) {
        return;
      }

      // Get relation nature
      let details;
      const targetName = association.model || association.collection || '';
      const infos = this.getNature(
        association,
        key,
        undefined,
        model.toLowerCase()
      );

      if (targetName !== '*') {
        if (association.plugin) {
          details = _.get(
            strapi.plugins,
            [
              association.plugin,
              'models',
              targetName,
              'attributes',
              association.via,
            ],
            {}
          );
        } else {
          details = _.get(
            strapi.models,
            [targetName, 'attributes', association.via],
            {}
          );
        }
      }

      // Build associations object
      if (_.has(association, 'collection') && association.collection !== '*') {
        const ast = {
          alias: key,
          type: 'collection',
          collection: association.collection,
          via: association.via || undefined,
          nature: infos.nature,
          autoPopulate: _.get(association, 'autoPopulate', true),
          dominant: details.dominant !== true,
          plugin: association.plugin || undefined,
          filter: details.filter,
        };

        if (infos.nature === 'manyToMany' && definition.orm === 'bookshelf') {
          ast.tableCollectionName =
            _.get(association, 'collectionName') ||
            this.getCollectionName(details, association);
        }

        if (infos.nature === 'manyWay' && definition.orm === 'bookshelf') {
          ast.tableCollectionName = `${
            definition.collectionName
          }__${_.snakeCase(key)}`;
        }

        definition.associations.push(ast);
        return;
      }

      if (_.has(association, 'model') && association.model !== '*') {
        definition.associations.push({
          alias: key,
          type: 'model',
          model: association.model,
          via: association.via || undefined,
          nature: infos.nature,
          autoPopulate: _.get(association, 'autoPopulate', true),
          dominant: details.dominant !== true,
          plugin: association.plugin || undefined,
          filter: details.filter,
        });
        return;
      }

      const pluginsModels = Object.keys(strapi.plugins).reduce(
        (acc, current) => {
          Object.keys(strapi.plugins[current].models).forEach(entity => {
            Object.keys(
              strapi.plugins[current].models[entity].attributes
            ).forEach(attribute => {
              const attr =
                strapi.plugins[current].models[entity].attributes[attribute];

              if (
                (attr.collection || attr.model || '').toLowerCase() ===
                  model.toLowerCase() &&
                strapi.plugins[current].models[entity].globalId !==
                  definition.globalId
              ) {
                acc.push(strapi.plugins[current].models[entity].globalId);
              }
            });
          });

          return acc;
        },
        []
      );

      const appModels = Object.keys(strapi.models).reduce((acc, entity) => {
        Object.keys(strapi.models[entity].attributes).forEach(attribute => {
          const attr = strapi.models[entity].attributes[attribute];

          if (
            (attr.collection || attr.model || '').toLowerCase() ===
              model.toLowerCase() &&
            strapi.models[entity].globalId !== definition.globalId
          ) {
            acc.push(strapi.models[entity].globalId);
          }
        });

        return acc;
      }, []);

      const groupModels = Object.keys(strapi.groups).reduce((acc, entity) => {
        Object.keys(strapi.groups[entity].attributes).forEach(attribute => {
          const attr = strapi.groups[entity].attributes[attribute];

          if (
            (attr.collection || attr.model || '').toLowerCase() ===
              model.toLowerCase() &&
            strapi.groups[entity].globalId !== definition.globalId
          ) {
            acc.push(strapi.groups[entity].globalId);
          }
        });

        return acc;
      }, []);

      const models = _.uniq(
        appModels.concat(pluginsModels).concat(groupModels)
      );

      definition.associations.push({
        alias: key,
        type: association.model ? 'model' : 'collection',
        related: models,
        nature: infos.nature,
        autoPopulate: _.get(association, 'autoPopulate', true),
        filter: association.filter,
      });
    } catch (e) {
      strapi.log.error(
        `Something went wrong in the model \`${_.upperFirst(
          model
        )}\` with the attribute \`${key}\``
      );
      strapi.log.error(e);
      strapi.stop();
    }
  },

  convertParams: (entity, params) => {
    if (!entity) {
      throw new Error(
        "You can't call the convert params method without passing the model's name as a first argument."
      );
    }

    // Remove the source params (that can be sent from the ctm plugin) since it is not a filter
    if (params.source) {
      delete params.source;
    }

    const model = entity.toLowerCase();

    const models = _.assign(
      _.clone(strapi.models),
      _.clone(strapi.admin.models),
      Object.keys(strapi.plugins).reduce((acc, current) => {
        _.assign(acc, _.get(strapi.plugins[current], ['models'], {}));
        return acc;
      }, {})
    );

    if (!_.has(models, model)) {
      return this.log.error(`The model ${model} can't be found.`);
    }

    const client = models[model].client;
    const connector = models[model].orm;

    if (!connector) {
      throw new Error(
        `Impossible to determine the ORM used for the model ${model}.`
      );
    }

    const convertor = strapi.db.connectors.get(connector).getQueryParams;
    const convertParams = {
      where: {},
      sort: '',
      start: 0,
      limit: 100,
    };

    _.forEach(params, (value, key) => {
      let result;
      let formattedValue;
      let modelAttributes = models[model]['attributes'];
      let fieldType;
      // Get the field type to later check if it's a string before number conversion
      if (modelAttributes[key]) {
        fieldType = modelAttributes[key]['type'];
      } else {
        // Remove the filter keyword at the end
        let splitKey = key.split('_').slice(0, -1);
        splitKey = splitKey.join('_');
        if (modelAttributes[splitKey]) {
          fieldType = modelAttributes[splitKey]['type'];
        }
      }
      // Check if the value is a valid candidate to be converted to a number value
      if (fieldType !== 'string') {
        formattedValue = isNumeric(value) ? _.toNumber(value) : value;
      } else {
        formattedValue = value;
      }

      if (_.includes(['_start', '_limit', '_populate'], key)) {
        result = convertor(formattedValue, key);
      } else if (key === '_sort') {
        const [attr, order = 'ASC'] = formattedValue.split(':');
        result = convertor(order, key, attr);
      } else {
        const suffix = key.split('_');
        // Mysql stores boolean as 1 or 0
        if (
          client === 'mysql' &&
          _.get(models, [model, 'attributes', suffix, 'type']) === 'boolean'
        ) {
          formattedValue = value.toString() === 'true' ? '1' : '0';
        }

        let type;

        if (
          _.includes(
            [
              'ne',
              'lt',
              'gt',
              'lte',
              'gte',
              'contains',
              'containss',
              'in',
              'nin',
            ],
            _.last(suffix)
          )
        ) {
          type = `_${_.last(suffix)}`;
          key = _.dropRight(suffix).join('_');
        } else {
          type = '=';
        }

        result = convertor(formattedValue, type, key);
      }

      _.set(convertParams, result.key, result.value);
    });

    return convertParams;
  },
};
