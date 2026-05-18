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
import { Context } from '../types';

export type Builders = ReturnType<typeof enums> &
  ReturnType<typeof dynamicZone> &
  ReturnType<typeof entity> &
  ReturnType<typeof typeBuilder> &
  ReturnType<typeof response> &
  ReturnType<typeof responseCollection> &
  ReturnType<typeof relationResponseCollection> &
  ReturnType<typeof queries> &
  ReturnType<typeof mutations> &
  ReturnType<typeof filters> &
  ReturnType<typeof inputs> &
  ReturnType<typeof genericMorph> &
  ReturnType<typeof resolvers>;

const buildersFactories: ReadonlyArray<(context: Context) => object> = [
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
  const buildersMap = new Map<string, Builders>();

  return {
    /**
     * Instantiate every builder with a strapi instance & a type registry
     */
    new(name: string, registry: TypeRegistry): Builders {
      const context: Context = { strapi, registry };

      const builders = buildersFactories
        // Create a new instance of every builders
        .map((factory) => factory(context))
        // Merge every builder into the same object
        .reduce<Builders>((a, c) => Object.assign(a, c), {} as Builders);

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
     * the builders map for a given name.
     *
     * `content-api` builders are always instantiated at bootstrap before any
     * consumer runs, so that name is typed as always-present (and guarded at
     * runtime below); every other name may be missing.
     */
    get<Name extends string>(
      name: Name
    ): Name extends 'content-api' ? Builders : Builders | undefined {
      const builders = buildersMap.get(name);

      if (name === 'content-api' && !builders) {
        throw new Error(`[@strapi/plugin-graphql] Missing builders for ${name}`);
      }

      return builders as Name extends 'content-api' ? Builders : Builders | undefined;
    },

    filters: {
      operators: operators({ strapi }),
    },

    utils: utils({ strapi }),
  };
};
