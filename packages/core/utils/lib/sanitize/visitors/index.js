'use strict';

const composeVisitors = (visitors) => {
  /*
    reduceRight is used to iterate through the array of visitors
    in reverse order, starting with the last method in the array.
    The initial value for the reduction is an empty function
    that serves as the final "next" function in the sequence.
  */
  return visitors.reduceRight(
    (next, visitor) => {
      return async (options, utils) => {
        await visitor(options, utils);
        // If the visitor did not remove the key, call the next one.
        if (options.key in options.data) return next(options, utils);
      };
    },
    () => {}
  );
};

module.exports = {
  composeVisitors,
  removePassword: require('./remove-password'),
  removePrivate: require('./remove-private'),
  removeRestrictedRelations: require('./remove-restricted-relations'),
  allowedFields: require('./allowed-fields'),
  restrictedFields: require('./restricted-fields'),
};
