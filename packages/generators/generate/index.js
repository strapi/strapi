'use strict';

process.argv.splice(2, 1);

const { join } = require('path');
const { Plop, run } = require('plop');

module.exports = () => {
  Plop.launch({ configPath: join(__dirname, 'plopfile.js') }, run);
};
