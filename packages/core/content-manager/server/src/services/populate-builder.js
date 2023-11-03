'use strict';

const { isNil } = require('lodash/fp');
const { getDeepPopulate, getQueryPopulate } = require('./utils/populate');

/**
 * Builder to create a Strapi populate object.
 *
 * @param {string} uid - Content type UID
 *
 * @example
 * const populate = await populateBuilder('api::article.article').countRelations().build();
 * // populate = { article: { populate: { count: true } } }
 *
 */
const populateBuilder = (uid) => {
  let getInitialPopulate = async () => {};
  const deepPopulateOptions = {
    countMany: false,
    countOne: false,
    maxLevel: -1,
  };

  const builder = {
    /**
     * Populates all attribute fields present in a query.
     * @param {Object} query - Query object
     * @returns {typeof builder} - Builder
     */
    populateFromQuery(query) {
      getInitialPopulate = async () => getQueryPopulate(uid, query);
      return builder;
    },
    /**
     * Populate relations as count if condition is true.
     * @param {Boolean} condition
     * @param {Object} [options]
     * @param {Boolean} [options.toMany] - Populate XtoMany relations as count if true.
     * @param {Boolean} [options.toOne] - Populate XtoOne relations as count if true.
     * @returns {typeof builder} - Builder
     */
    countRelationsIf(condition, { toMany, toOne } = { toMany: true, toOne: true }) {
      if (condition) {
        return this.countRelations({ toMany, toOne });
      }
      return builder;
    },
    /**
     * Populate relations as count.
     * @param {Object} [options]
     * @param {Boolean } [options.toMany] - Populate XtoMany relations as count if true.
     * @param {Boolean} [options.toOne] - Populate XtoOne relations as count if true.
     * @returns {typeof builder} - Builder
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
     * @param {Number} [level=Infinity] - Max level of nested populate.
     * @returns {typeof builder} - Builder
     */
    populateDeep(level = Infinity) {
      deepPopulateOptions.maxLevel = level;
      return builder;
    },
    /**
     * Construct the populate object based on the builder options.
     * @returns {Object} - Populate object
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

module.exports = () => populateBuilder;
