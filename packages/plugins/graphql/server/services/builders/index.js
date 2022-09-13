'use strict';

const { merge, map, pipe, reduce } = require('lodash/fp');

// Builders Factories

const enums = require('./enums');
const dynamicZone = require('./dynamic-zones');
const entity = require('./entity');
const entityMeta = require('./entity-meta');
const type = require('./type');
const response = require('./response');
const responseCollection = require('./response-collection');
const relationResponseCollection = require('./relation-response-collection');
const queries = require('./queries');
const mutations = require('./mutations');
const filters = require('./filters');
const inputs = require('./input');
const genericMorph = require('./generic-morph');
const resolvers = require('./resolvers');

// Misc

const operators = require('./filters/operators');
const utils = require('./utils');

const buildersFactories = [
  enums,
  dynamicZone,
  entity,
  entityMeta,
  type,
  response,
  responseCollection,
  relationResponseCollection,
  queries,
  mutations,
  filters,
  inputs,
  genericMorph,
  resolvers,
];

module.exports = ({ strapi }) => {
  const buildersMap = new Map();

  return {
    /**
     * Instantiate every builder with a strapi instance & a type registry
     * @param {string} name
     * @param {object} registry
     */
    new(name, registry) {
      const context = { strapi, registry };

      const builders = pipe(
        // Create a new instance of every builders
        map((factory) => factory(context)),
        // Merge every builder into the same object
        reduce(merge, {})
      ).call(null, buildersFactories);

      buildersMap.set(name, builders);

      return builders;
    },

    /**
     * Delete a set of builders instances from
     * the builders map for a given name
     * @param {string} name
     */
    delete(name) {
      buildersMap.delete(name);
    },

    /**
     * Retrieve a set of builders instances from
     * the builders map for a given name
     * @param {string} name
     */
    get(name) {
      return buildersMap.get(name);
    },

    filters: {
      operators: operators({ strapi }),
    },

    utils: utils({ strapi }),
  };
};
