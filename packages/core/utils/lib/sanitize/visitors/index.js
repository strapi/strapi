'use strict';

const composeVisitors = (visitors) => {
  return async (options, utils) => {
    for (const visitor of visitors) {
      await visitor(options, utils);
      // If the visitor did not remove the key, continue with the next one.
      if (!(options.key in options.data)) break;
    }
  };
};

module.exports = {
  composeVisitors,
  removePassword: require('./remove-password'),
  removePrivate: require('./remove-private'),
  removeRestrictedRelations: require('./remove-restricted-relations'),
  allowedFields: require('./allowed-fields'),
  restrictedFields: require('./restricted-fields'),
};
