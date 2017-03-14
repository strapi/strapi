'use strict';

/**
 * Expose main routes of the generated plugin
 */

module.exports = scope => {
  function generateRoutes() {
    return {
      routes: [{
        method: 'GET',
        path: '/',
        handler: scope.globalID + '.index',
        config: {
          policies: []
        }
      }]
    };
  }

  return generateRoutes();
};
