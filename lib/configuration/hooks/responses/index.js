'use strict';

module.exports = function () {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      enabled: true
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      cb();
    }
  };

  return hook;
};
