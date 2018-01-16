'use strict';

module.exports = scope => {

  // Finally, return the JSON.
  return {
    defaultConnection: 'default',
    connections: {
      default: scope.database
    }
  };
};
