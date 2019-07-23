'use strict';

module.exports = function stopProcess(message) {
  console.error(message);
  process.exit(1);
};
