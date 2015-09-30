'use strict';

/**
 * Blueprints hook
 */

module.exports = function () {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      blueprints: {
        defaultLimit: 30,
        populate: true
      }
    },

    /**
     * Export functions
     */

    // Utils
    actionUtil: require('./actionUtil'),
    associationUtil: require('./associationUtil'),

    // Actions
    find: require('./actions/find'),
    findOne: require('./actions/findOne'),
    create: require('./actions/create'),
    update: require('./actions/update'),
    destroy: require('./actions/destroy'),
    remove: require('./actions/remove'),
    add: require('./actions/add'),

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      cb();
    }
  };

  return hook;
};
