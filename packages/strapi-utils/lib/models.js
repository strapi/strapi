'use strict';

/**
 * Module dependencies
 */

// Node.js core
const path = require('path');

// Public node modules.
const _ = require('lodash');
const pluralize = require('pluralize');

// Following this discussion https://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric this function is the best implem to determine if a value is a valid number candidate
const isNumeric = (value) => {
  return !_.isObject(value) && !isNaN(parseFloat(value)) && isFinite(value);
};

// Constants
const ORDERS = ['ASC', 'DESC'];

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
   * Find primary key per ORM
   */

  getPK: function (collectionIdentity, collection, models) {
    if (_.isString(collectionIdentity)) {
      const ORM = this.getORM(collectionIdentity);
      try {
        const GraphQLFunctions = require(path.resolve(strapi.config.appPath, 'node_modules', 'strapi-' + ORM, 'lib', 'utils'));

        if (!_.isUndefined(GraphQLFunctions)) {
          return GraphQLFunctions.getPK(collectionIdentity, collection, models || strapi.models);
        }
      } catch (err) {
        return undefined;
      }
    }

    return undefined;
  },

  /**
   * Retrieve the value based on the primary key
   */

  getValuePrimaryKey: (value, defaultKey) => {
    return value[defaultKey] || value.id || value._id;
  },

  /**
   * Find primary key per ORM
   */

  getCount: function (collectionIdentity) {
    if (_.isString(collectionIdentity)) {
      const ORM = this.getORM(collectionIdentity);

      try {
        const ORMFunctions = require(path.resolve(strapi.config.appPath, 'node_modules', 'strapi-' + ORM, 'lib', 'utils'));

        if (!_.isUndefined(ORMFunctions)) {
          return ORMFunctions.getCount(collectionIdentity);
        }
      } catch (err) {
        return undefined;
      }
    }

    return undefined;
  },

  /**
   * Find relation nature with verbose
   */

  getNature: (association, key, models, currentModelName) => {
    try {
      const types = {
        current: '',
        other: ''
      };

      if (_.isUndefined(models)) {
        models = association.plugin ? strapi.plugins[association.plugin].models : strapi.models;
      }

      if ((association.hasOwnProperty('collection') && association.collection === '*') || (association.hasOwnProperty('model') && association.model === '*')) {
        if (association.model) {
          types.current = 'morphToD';
        } else {
          types.current = 'morphTo';
        }

        const flattenedPluginsModels = Object.keys(strapi.plugins).reduce((acc, current) => {
          Object.keys(strapi.plugins[current].models).forEach((model) => {
            acc[`${current}_${model}`] = strapi.plugins[current].models[model];
          });

          return acc;
        }, {});

        const allModels = _.merge({}, strapi.models, flattenedPluginsModels);

        // We have to find if they are a model linked to this key
        _.forIn(allModels, model => {
          _.forIn(model.attributes, attribute => {
            if (attribute.hasOwnProperty('via') && attribute.via === key && attribute.model === currentModelName) {
              if (attribute.hasOwnProperty('collection')) {
                types.other = 'collection';

                // Break loop
                return false;
              } else if (attribute.hasOwnProperty('model')) {
                types.other = 'model';

                // Break loop
                return false;
              }
            }
          });
        });
      } else if (association.hasOwnProperty('via') && association.hasOwnProperty('collection')) {
        const relatedAttribute = models[association.collection].attributes[association.via];

        if (!relatedAttribute) {
          throw new Error(`The attribute \`${association.via}\` is missing in the model ${_.upperFirst(association.collection)} ${association.plugin ? '(plugin - ' + association.plugin + ')' : '' }`);
        }

        types.current = 'collection';

        if (relatedAttribute.hasOwnProperty('collection') && relatedAttribute.collection !== '*' && relatedAttribute.hasOwnProperty('via')) {
          types.other = 'collection';
        } else if (relatedAttribute.hasOwnProperty('collection') && relatedAttribute.collection !== '*' && !relatedAttribute.hasOwnProperty('via')) {
          types.other = 'collectionD';
        } else if (relatedAttribute.hasOwnProperty('model') && relatedAttribute.model !== '*') {
          types.other = 'model';
        } else if (relatedAttribute.hasOwnProperty('collection') || relatedAttribute.hasOwnProperty('model')) {
          types.other = 'morphTo';
        }
      } else if (association.hasOwnProperty('via') && association.hasOwnProperty('model')) {
        types.current = 'modelD';

        // We have to find if they are a model linked to this key
        const model = models[association.model];
        const attribute = model.attributes[association.via];

        if (attribute.hasOwnProperty('via') && attribute.via === key && attribute.hasOwnProperty('collection') && attribute.collection !== '*') {
          types.other = 'collection';
        } else if (attribute.hasOwnProperty('model') && attribute.model !== '*') {
          types.other = 'model';
        } else if (attribute.hasOwnProperty('collection') || attribute.hasOwnProperty('model')) {
          types.other = 'morphTo';
        }
      } else if (association.hasOwnProperty('model')) {
        types.current = 'model';

        // We have to find if they are a model linked to this key
        _.forIn(models, model => {
          _.forIn(model.attributes, attribute => {
            if (attribute.hasOwnProperty('via') && attribute.via === key) {
              if (attribute.hasOwnProperty('collection')) {
                types.other = 'collection';

                // Break loop
                return false;
              } else if (attribute.hasOwnProperty('model')) {
                types.other = 'modelD';

                // Break loop
                return false;
              }
            }
          });
        });
      } else if (association.hasOwnProperty('collection')) {
        types.current = 'collectionD';

        // We have to find if they are a model linked to this key
        _.forIn(models, model => {
          _.forIn(model.attributes, attribute => {
            if (attribute.hasOwnProperty('via') && attribute.via === key) {
              if (attribute.hasOwnProperty('collection')) {
                types.other = 'collection';

                // Break loop
                return false;
              } else if (attribute.hasOwnProperty('model')) {
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
          verbose: 'morphMany'
        };
      } else if (types.current === 'collection' && types.other === 'morphToD') {
        return {
          nature: 'manyToOneMorph',
          verbose: 'morphMany'
        };
      }  else if (types.current === 'modelD' && types.other === 'morphTo') {
        return {
          nature: 'oneToManyMorph',
          verbose: 'morphOne'
        };
      } else if (types.current === 'modelD' && types.other === 'morphToD') {
        return {
          nature: 'oneToOneMorph',
          verbose: 'morphOne'
        };
      } else if (types.current === 'morphToD' && types.other === 'collection') {
        return {
          nature: 'oneMorphToMany',
          verbose: 'belongsToMorph'
        };
      } else if (types.current === 'morphToD' && types.other === 'model') {
        return {
          nature: 'oneMorphToOne',
          verbose: 'belongsToMorph'
        };
      } else if (types.current === 'morphTo' && (types.other === 'model' || association.hasOwnProperty('model'))) {
        return {
          nature: 'manyMorphToOne',
          verbose: 'belongsToManyMorph'
        };
      } else if (types.current === 'morphTo' && (types.other === 'collection' || association.hasOwnProperty('collection'))) {
        return {
          nature: 'manyMorphToMany',
          verbose: 'belongsToManyMorph'
        };
      } else if (types.current === 'modelD' && types.other === 'model') {
        return {
          nature: 'oneToOne',
          verbose: 'belongsTo'
        };
      } else if (types.current === 'model' && types.other === 'modelD') {
        return {
          nature: 'oneToOne',
          verbose: 'hasOne'
        };
      } else if ((types.current === 'model' || types.current === 'modelD') && types.other === 'collection') {
        return {
          nature: 'manyToOne',
          verbose: 'belongsTo'
        };
      } else if (types.current === 'modelD' && types.other === 'collection') {
        return {
          nature: 'oneToMany',
          verbose: 'hasMany'
        };
      } else if (types.current === 'collection' && types.other === 'model') {
        return {
          nature: 'oneToMany',
          verbose: 'hasMany'
        };
      } else if (types.current === 'collection' && types.other === 'collection') {
        return {
          nature: 'manyToMany',
          verbose: 'belongsToMany'
        };
      } else if (types.current === 'collectionD' && types.other === 'collection' || types.current === 'collection' && types.other === 'collectionD') {
        return {
          nature: 'manyToMany',
          verbose: 'belongsToMany'
        };
      } else if (types.current === 'collectionD' && types.other === '') {
        return {
          nature: 'manyWay',
          verbose: 'belongsToMany'
        };
      } else if (types.current === 'model' && types.other === '') {
        return {
          nature: 'oneWay',
          verbose: 'belongsTo'
        };
      }

      return undefined;
    } catch (e) {
      strapi.log.error(`Something went wrong in the model \`${_.upperFirst(currentModelName)}\` with the attribute \`${key}\``);
      strapi.log.error(e);
      strapi.stop();
    }
  },

  /**
   * Return ORM used for this collection.
   */

  getORM: collectionIdentity => {
    return _.get(strapi.models, collectionIdentity.toLowerCase() + '.orm');
  },

  /**
   * Return table name for a collection many-to-many
   */
  getCollectionName: (associationA, associationB) => {
    return [associationA, associationB]
      .sort((a, b) => a.collection < b.collection ? -1 : 1)
      .map(table => _.snakeCase(`${pluralize.plural(table.collection)} ${pluralize.plural(table.via)}`))
      .join('__');
  },

  /**
   * Define associations key to models
   */

  defineAssociations: function (model, definition, association, key) {
    try {
      // Initialize associations object
      if (definition.associations === undefined) {
        definition.associations = [];
      }

      // Exclude non-relational attribute
      if (!association.hasOwnProperty('collection') && !association.hasOwnProperty('model')) {
        return undefined;
      }

      // Get relation nature
      let details;
      const globalName = association.model || association.collection || '';
      const infos = this.getNature(association, key, undefined, model.toLowerCase());

      if (globalName !== '*') {
        details = association.plugin ?
          _.get(strapi.plugins, `${association.plugin}.models.${globalName}.attributes.${association.via}`, {}):
          _.get(strapi.models, `${globalName}.attributes.${association.via}`, {});
      }

      // Build associations object
      if (association.hasOwnProperty('collection') && association.collection !== '*') {
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

        if (infos.nature === 'manyToMany' && !association.plugin && definition.orm === 'bookshelf') {
          ast.tableCollectionName = this.getCollectionName(association, details);
        }

        definition.associations.push(ast);
      } else if (association.hasOwnProperty('model') && association.model !== '*') {
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
      } else if (association.hasOwnProperty('collection') || association.hasOwnProperty('model')) {
        const pluginsModels = Object.keys(strapi.plugins).reduce((acc, current) => {
          Object.keys(strapi.plugins[current].models).forEach((entity) => {
            Object.keys(strapi.plugins[current].models[entity].attributes).forEach((attribute) => {
              const attr = strapi.plugins[current].models[entity].attributes[attribute];

              if (
                (attr.collection || attr.model || '').toLowerCase() === model.toLowerCase() &&
                strapi.plugins[current].models[entity].globalId !== definition.globalId
              ) {
                acc.push(strapi.plugins[current].models[entity].globalId);
              }
            });
          });

          return acc;
        }, []);

        const appModels = Object.keys(strapi.models).reduce((acc, entity) => {
          Object.keys(strapi.models[entity].attributes).forEach((attribute) => {
            const attr = strapi.models[entity].attributes[attribute];

            if (
              (attr.collection || attr.model || '').toLowerCase() === model.toLowerCase() &&
              strapi.models[entity].globalId !== definition.globalId
            ) {
              acc.push(strapi.models[entity].globalId);
            }
          });

          return acc;
        }, []);

        const models = _.uniq(appModels.concat(pluginsModels));

        definition.associations.push({
          alias: key,
          type: association.model ? 'model' : 'collection',
          related: models,
          nature: infos.nature,
          autoPopulate: _.get(association, 'autoPopulate', true),
          filter: association.filter,
        });
      }
    } catch (e) {
      strapi.log.error(`Something went wrong in the model \`${_.upperFirst(model)}\` with the attribute \`${key}\``);
      strapi.log.error(e);
      strapi.stop();
    }
  },

  getVia: (attribute, association) => {
    return _.findKey(strapi.models[association.model || association.collection].attributes, {via: attribute});
  },

  convertParams: (entity, params) => {
    const { model, models, convertor, postProcessValue } = this.prepareStage(
      entity,
      params
    );

    const _filter = this.splitPrimitiveAndRelationValues(params);

    // Execute Steps in the given order
    return _.flow([
      this.processValues({ model, models, convertor, postProcessValue }),
      this.processPredicates({ model, models, convertor }),
      this.processGeneratedResults(),
    ])(_filter);
  },

  prepareStage: (entity, params) => {
    if (!entity) {
      throw new Error(
        'You can\'t call the convert params method without passing the model\'s name as a first argument.'
      );
    }

    // Remove the source params (that can be sent from the ctm plugin) since it is not a filter
    if (params.source) {
      delete params.source;
    }

    const modelName = entity.toLowerCase();
    const models = this.getStrapiModels();
    const model = models[modelName];

    if (!model) {
      throw new Error(`The model ${modelName} can't be found.`);
    }

    if (!model.orm) {
      throw new Error(
        `Impossible to determine the ORM used for the model ${modelName}.`
      );
    }

    const hook = strapi.hook[model.orm];
    const convertor = hook.load().getQueryParams;
    const postProcessValue = hook.load().postProcessValue || _.identity;

    return {
      models,
      model,
      hook,
      convertor,
      postProcessValue,
    };
  },

  getStrapiModels: () => {
    return {
      ...strapi.models,
      ...Object.keys(strapi.plugins).reduce(
        (acc, pluginName) => ({
          ...acc,
          ..._.get(strapi.plugins[pluginName], 'models', {}),
        }),
        {}
      ),
    };
  },

  splitPrimitiveAndRelationValues: _query => {
    const result = _.reduce(
      _query,
      (acc, value, key) => {
        if (_.startsWith(key, '_')) {
          acc[key] = value;
        } else if (!_.includes(key, '.')) {
          acc.where[key] = value;
        } else {
          _.set(acc.relations, this.injectRelationInKey(key), value);
        }
        return acc;
      },
      {
        where: {},
        relations: {},
        sort: '',
        start: 0,
        limit: 100,
      }
    );
    return result;
  },

  injectRelationInKey: key => {
    const numberOfRelations = key.match(/\./gi).length - 1;
    const relationStrings = _.times(numberOfRelations, _.constant('relations'));
    return _.chain(key)
      .split('.')
      .zip(relationStrings)
      .flatten()
      .compact()
      .join('.')
      .value();
  },

  transformFilter: (filter, iteratee) => {
    if (!_.isArray(filter) && !_.isPlainObject(filter)) {
      return filter;
    }

    return _.transform(filter, (updatedFilter, value, key) => {
      const updatedValue = iteratee(value, key);
      updatedFilter[key] = this.transformFilter(updatedValue, iteratee);
      return updatedFilter;
    });
  },

  processValues: ({ model, models, convertor, postProcessValue }) => filter => {
    let parentModel = model;
    return this.transformFilter(filter, (value, key) => {
      const field = this.getFieldFromKey(key, parentModel);
      if (!field) {
        return this.processMeta(value, key, {
          field,
          client: model.client,
          model,
          convertor,
        });
      }
      if (field.collection || field.model) {
        parentModel = models[field.collection || field.model];
      }
      return postProcessValue(
        this.processValue(value, key, { field, client: model.client, model })
      );
    });
  },

  getFieldFromKey: (key, model) => {
    let field;
    // Primary key is a unique case because it doesn't belong to the model's attributes
    if (key === model.primaryKey) {
      field = {
        type: 'ID', // Just in case
      };
    } else if (model.attributes[key]) {
      field = model.attributes[key];
    } else {
      // Remove the filter keyword at the end
      let splitKey = key.split('_').slice(0, -1);
      splitKey = splitKey.join('_');

      if (model.attributes[splitKey]) {
        field = model.attributes[splitKey];
      }
    }

    return field;
  },

  processValue: (value, key, { field, client }) => {
    if (field.type === 'boolean' && client === 'mysql') {
      return value === 'true' ? '1' : '0';
    }

    return value;
  },

  processMeta: (value, key, { convertor, model }) => {
    if (_.includes(['_start', '_limit'], key)) {
      return convertor(value, key);
    } else if (key === '_sort') {
      return this.processSortMeta(value, key, { convertor, model });
    }

    return value;
  },

  processSortMeta: (value, key, { convertor, model }) => {
    const [attr, order = 'ASC'] = value.split(':');
    if (!_.includes(ORDERS, order)) {
      throw new Error(
        `Unkown order value: "${order}", available values are: ${ORDERS.join(
          ', '
        )}`
      );
    }

    const field = this.getFieldFromKey(attr, model);
    if (!field) {
      throw new Error(`Unkown field: "${attr}"`);
    }

    return convertor(order, key, attr);
  },

  processPredicates: ({ model, models, convertor }) => filter => {
    let parentModel = model;
    return this.transformFilter(filter, (value, key) => {
      const field = this.getFieldFromKey(key, parentModel);
      if (!field) {
        return value;
      }
      if (field.collection || field.model) {
        parentModel = models[field.collection || field.model];
      }
      return this.processCriteriaMeta(value, key, { convertor });
    });
  },

  processCriteriaMeta: (value, key, { convertor }) => {
    let type = '=';
    if (key.match(/_{1}(?:ne|lte?|gte?|containss?|in)/)) {
      type = key.match(/_{1}(?:ne|lte?|gte?|containss?|in)/)[0];
      key = key.replace(type, '');
    }
    return convertor(value, type, key);
  },

  processGeneratedResults: () => filter => {
    if (!_.isArray(filter) && !_.isPlainObject(filter)) {
      return filter;
    }

    return _.transform(filter, (updatedFilter, value, key) => {
      // Only set results for object of shape { value, key }
      if (_.has(value, 'value') && _.has(value, 'key')) {
        const cleanKey = _.replace(value.key, 'where.', '');
        _.set(updatedFilter, cleanKey, this.processGeneratedResults()(value.value));
      } else {
        updatedFilter[key] = this.processGeneratedResults()(value);
      }

      return updatedFilter;
    });
  },
};
