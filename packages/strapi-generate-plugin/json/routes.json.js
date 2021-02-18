'use strict';

/**
 * Expose main routes of the generated plugin
 */

module.exports = scope => {
  function generateRoutes() {
    return {
      routes: [
        {
          method: 'GET',
          path: '/',
          handler: scope.name + '.index',
          config: {
            policies: [],
          },
        },
      ],
    };
  }

  return generateRoutes();
};
