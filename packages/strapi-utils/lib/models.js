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

  getNature: (association, key, models) => {
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
      _.forIn(models, model => {
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
    } else if (types.current === 'model' && types.other === 'collection') {
      return {
        nature: 'oneToMany',
        verbose: 'belongsTo'
      };
    } else if (types.current === 'collection' && types.other === 'model') {
      return {
        nature: 'manyToOne',
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
    const infos = this.getNature(association, key);

    // Build associations object
    if (association.hasOwnProperty('collection')) {
      definition.associations.push({
        alias: key,
        type: 'collection',
        collection: association.collection,
        via: association.via || undefined,
        nature: infos.nature,
        autoPopulate: (_.get(association, 'autoPopulate') || _.get(strapi.config, 'jsonapi.enabled')) === true
      });
    } else if (association.hasOwnProperty('model')) {
      definition.associations.push({
        alias: key,
        type: 'model',
        model: association.model,
        via: association.via || undefined,
        nature: infos.nature,
        autoPopulate: (_.get(association, 'autoPopulate') || _.get(strapi.config, 'jsonapi.enabled')) === true
      });
    }
  },

  getVia: (attribute, association) => {
    return _.findKey(strapi.models[association.model || association.collection].attributes, {via: attribute});
  }
};
