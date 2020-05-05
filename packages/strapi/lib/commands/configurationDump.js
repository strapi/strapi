'use strict';

const fs = require('fs');
const { logger } = require('strapi-utils');
const loadConfiguration = require('../core/app-configuration');
const strapi = require('../index');

module.exports = async function({ file }) {
  const output = file ? fs.createWriteStream(file) : process.stdout;

  output.write('this is a test');

  const app = strapi();

  await app.load();

  const confs = await app.query('core_store').find({
    key_contains: 'plugin',
  });

  console.log(confs);

  output.write('\n');
  output.end();
};
