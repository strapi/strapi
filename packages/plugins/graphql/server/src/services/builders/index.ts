import { merge, map, pipe, reduce } from 'lodash/fp';
import type { Core } from '@strapi/types';

// Builders Factories

import enums from './enums';
import dynamicZone from './dynamic-zones';
import entity from './entity';
import typeBuilder from './type';
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
import type { TypeRegistry } from '../type-registry';

const buildersFactories = [
  enums,
  dynamicZone,
  entity,
  typeBuilder,
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

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const buildersMap = new Map();

  return {
    /**
     * Instantiate every builder with a strapi instance & a type registry
     */
    new(name: string, registry: TypeRegistry) {
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
