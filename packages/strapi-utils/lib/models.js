'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Node.js core
const path = require('path');

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
    const types = {
      current: '',
      other: ''
    };

    if (_.isUndefined(models)) {
      models = global['strapi'].models;
    }

    if (association.hasOwnProperty('via') && association.hasOwnProperty('collection')) {
      const relatedAttribute = models[association.collection].attributes[association.via];

      types.current = 'collection';

      if (relatedAttribute.hasOwnProperty('collection') && relatedAttribute.hasOwnProperty('via')) {
        types.other = 'collection';
      } else if (relatedAttribute.hasOwnProperty('collection') && !relatedAttribute.hasOwnProperty('via')) {
        types.other = 'collectionD';
      } else if (relatedAttribute.hasOwnProperty('model')) {
        types.other = 'model';
      }
    } else if (association.hasOwnProperty('via') && association.hasOwnProperty('model')) {
      types.current = 'modelD';

      // We have to find if they are a model linked to this key
      _.forIn(_.omit(models, currentModelName || ''), model => {
        _.forIn(model.attributes, attribute => {
          if (attribute.hasOwnProperty('via') && attribute.via === key && attribute.hasOwnProperty('collection')) {
            types.other = 'collection';

            // Break loop
            return false;
          } else if (attribute.hasOwnProperty('model')) {
            types.other = 'model';

            // Break loop
            return false;
          }
        });
      });
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

    if (types.current === 'modelD' && types.other === 'model') {
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
  },

  /**
   * Return ORM used for this collection.
   */

  getORM: collectionIdentity => {
    return _.get(strapi.models, collectionIdentity.toLowerCase() + '.orm');
  },

  /**
   * Define associations key to models
   */

  defineAssociations: function (model, definition, association, key) {
    // Initialize associations object
    if (definition.associations === undefined) {
      definition.associations = [];
    }

    // Exclude non-relational attribute
    if (!association.hasOwnProperty('collection') && !association.hasOwnProperty('model')) {
      return undefined;
    }

    // Get relation nature
    const infos = this.getNature(association, key, undefined, model.toLowerCase());
    const details = _.get(strapi.models, `${association.model || association.collection}.attributes.${association.via}`, {});

    // Build associations object
    if (association.hasOwnProperty('collection')) {
      definition.associations.push({
        alias: key,
        type: 'collection',
        collection: association.collection,
        via: association.via || undefined,
        nature: infos.nature,
        autoPopulate: (_.get(association, 'autoPopulate') || _.get(strapi.config, 'jsonapi.enabled')) === true,
        dominant: details.dominant !== true
      });
    } else if (association.hasOwnProperty('model')) {
      definition.associations.push({
        alias: key,
        type: 'model',
        model: association.model,
        via: association.via || undefined,
        nature: infos.nature,
        autoPopulate: (_.get(association, 'autoPopulate') || _.get(strapi.config, 'jsonapi.enabled')) === true,
        dominant: details.dominant !== true
      });
    }
  },

  getVia: (attribute, association) => {
    return _.findKey(strapi.models[association.model || association.collection].attributes, {via: attribute});
  },

  convertParams: (entity, params) => {
    if (!entity) {
      throw new Error('You can\'t call the convert params method without passing the model\'s name as a first argument.');
    }

    const model = entity.toLowerCase();

    if (!strapi.models.hasOwnProperty(model)) {
      return this.log.error(`The model ${model} can't be found.`);
    }

    const connector = strapi.models[model].orm;

    if (!connector) {
      throw new Error(`Impossible to determine the use ORM for the model ${model}.`);
    }

    const convertor = strapi.hook[connector].load().getQueryParams;
    const convertParams = {
      where: {},
      sort: '',
      start: 0,
      limit: 100
    };

    _.forEach(params, (value, key)  => {
      let result;

      if (_.includes(['_start', '_limit'], key)) {
        result = convertor(value, key);
      } else if (key === '_sort') {
        const [attr, order] = value.split(':');
        result = convertor(order, key, attr);
      } else {
        const suffix = key.split('_');

        let type;

        if (_.includes(['ne', 'lt', 'gt', 'lte', 'gte'], _.last(suffix))) {
          type = `_${_.last(suffix)}`;
          key = _.dropRight(suffix).join('_');
        } else {
          type = '=';
        }

        result = convertor(value, type, key);
      }

      _.set(convertParams, result.key, result.value);
    });

    return convertParams;
  }
};
