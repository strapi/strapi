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
      return (...args) => {
        return visitor(...args, () => next(...args));
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
