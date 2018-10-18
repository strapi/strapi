'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Detect HTTP verb in an expression.
 *
 * @api private
 */

exports.detectRoute = endpoint => {
  const verbExpr = /^(all|get|post|put|delete|trace|options|connect|patch|head|redirect)\s+/i;
  let verb = _.last(endpoint.match(verbExpr) || []) || '';
  verb = verb.toLowerCase();

  // If a verb was specified, eliminate the verb from the original string.
  if (verb) {
    endpoint = endpoint.replace(verbExpr, '');
  }

  // Return the verb and the endpoint.
  return {
    verb,
    endpoint
  };
};
