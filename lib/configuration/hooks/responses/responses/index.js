'use strict';

/**
 * Index of the responses hook responses.
 */

module.exports = {
  badRequest: require('./badRequest'),
  created: require('./created'),
  forbidden: require('./forbidden'),
  notFound: require('./notFound'),
  ok: require('./ok'),
  serverError: require('./serverError')
};
