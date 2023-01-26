'use strict';

/**
 * Execute a test suite only if the condition is true
 */
const describeOnCondition = (bool) => (bool ? describe : describe.skip);

module.exports = {
  describeOnCondition,
};
