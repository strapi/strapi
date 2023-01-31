'use strict';

/**
 * Execute a test suite only if the condition is true
 * @return Jest.Describe
 */
const describeOnCondition = (bool) => (bool ? describe : describe.skip);

module.exports = {
  describeOnCondition,
};
