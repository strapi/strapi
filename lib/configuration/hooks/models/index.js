'use strict';

/**
 * Models hook
 */

module.exports = function () {
  const hook = {

    /**
     * Default options
     */

    defaults: {},

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      cb();
    }
  };

  return hook;
};
