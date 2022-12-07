import { merge, map, pipe, reduce } from 'lodash/fp';

// Builders Factories

import enums from './enums';
import dynamicZone from './dynamic-zones';
import entity from './entity';
import entityMeta from './entity-meta';
import type from './type';
import response from './response';
import responseCollection from './response-collection';
import relationResponseCollection from './relation-response-collection';
import queries from './queries';
import mutations from './mutations';
import filters from './filters';
import inputs from './input';
import genericMorph from './generic-morph';
import resolvers from './resolvers';

// Misc

import operators from './filters/operators';
import utils from './utils';
import { StrapiCTX } from '../../types/strapi-ctx';

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

export default ({ strapi }: StrapiCTX) => {
  const buildersMap = new Map();

  return {
    /**
     * Instantiate every builder with a strapi instance & a type registry
     */
    new(name: string, registry: any) {
      const context = { strapi, registry };

      const builders = pipe(
        // Create a new instance of every builders
        map((factory: any) => factory(context)),
        // Merge every builder into the same object
        reduce(merge, {})
      ).call(null, buildersFactories);

      buildersMap.set(name, builders);

      return builders;
    },

    /**
     * Delete a set of builders instances from
     * the builders map for a given name
     */
    delete(name: string) {
      buildersMap.delete(name);
    },

    /**
     * Retrieve a set of builders instances from
     * the builders map for a given name
     */
    get(name: string) {
      return buildersMap.get(name);
    },

    filters: {
      operators: operators({ strapi }),
    },

    utils: utils({ strapi }),
  };
};
