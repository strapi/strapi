import { isNil } from 'lodash/fp';
import type { UID } from '@strapi/types';
import { type Populate, getDeepPopulate, getQueryPopulate } from './utils/populate';

/**
 * Builder to create a Strapi populate object.
 *
 * @param uid - Content type UID
 *
 * @example
 * const populate = await populateBuilder('api::article.article').countRelations().build();
 * // populate = { article: { populate: { count: true } } }
 *
 */
const populateBuilder = (uid: UID.Schema) => {
  let getInitialPopulate = async (): Promise<undefined | Populate> => {
    return undefined;
  };
  const deepPopulateOptions = {
    countMany: false,
    countOne: false,
    maxLevel: -1,
  };

  const builder = {
    /**
     * Populates all attribute fields present in a query.
     * @param query - Strapi query object
     */
    populateFromQuery(query: object) {
      getInitialPopulate = async () => getQueryPopulate(uid, query);
      return builder;
    },

    /**
     * Populate relations as count.
     * @param [options]
     * @param [options.toMany] - Populate XtoMany relations as count if true.
     * @param [options.toOne] - Populate XtoOne relations as count if true.
     */
    countRelations({ toMany, toOne } = { toMany: true, toOne: true }) {
      if (!isNil(toMany)) {
        deepPopulateOptions.countMany = toMany;
      }
      if (!isNil(toOne)) {
        deepPopulateOptions.countOne = toOne;
      }
      return builder;
    },

    /**
     * Populate relations deeply, up to a certain level.
     * @param [level=Infinity] - Max level of nested populate.
     */
    populateDeep(level = Infinity) {
      deepPopulateOptions.maxLevel = level;
      return builder;
    },

    /**
     * Construct the populate object based on the builder options.
     * @returns Populate object
     */
    async build() {
      const initialPopulate = await getInitialPopulate();

      if (deepPopulateOptions.maxLevel === -1) {
        return initialPopulate;
      }

      return getDeepPopulate(uid, { ...deepPopulateOptions, initialPopulate });
    },
  };

  return builder;
};

export default () => populateBuilder;
