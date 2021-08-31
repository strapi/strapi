'use strict';

module.exports = function stopProcess(message) {
  if (message) console.error(message);
  process.exit(1);
};
