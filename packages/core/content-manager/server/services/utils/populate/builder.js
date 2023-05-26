'use strict';

const { getDeepPopulate, getQueryPopulate } = require('.');

function populateBuilder(uid) {
  let getInitialPopulate = async () => {};
  const deepPopulateOptions = {
    countMany: false,
    countOne: false,
    maxLevel: -1,
  };

  const builder = {
    /**
     * Populates fields present in a query.
     * Useful for populating fields that permissionChecker needs to validate.
     */
    populateFromQuery(query) {
      getInitialPopulate = async () => getQueryPopulate(uid, query);
      return builder;
    },
    countRelationsIf(condition, { toMany = true, toOne = true } = {}) {
      if (condition) {
        return this.countRelations({ toMany, toOne });
      }
      return builder;
    },
    countRelations({ toMany = true, toOne = true } = {}) {
      deepPopulateOptions.countMany = toMany;
      deepPopulateOptions.countOne = toOne;
      return builder;
    },
    populateDeep(level = Infinity) {
      deepPopulateOptions.maxLevel = level;
      return builder;
    },
    async build() {
      const initialPopulate = await getInitialPopulate();

      if (deepPopulateOptions.maxLevel === -1) {
        return initialPopulate;
      }

      return getDeepPopulate(uid, { ...deepPopulateOptions, initialPopulate });
    },
  };

  return builder;
}

module.exports = {
  populateBuilder,
};
