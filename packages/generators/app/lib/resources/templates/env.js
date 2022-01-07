'use strict';

const crypto = require('crypto');

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

module.exports = () => {
  const tmpl = fs.readFileSync(path.join(__dirname, 'env.template'));
  const compile = _.template(tmpl);

  return compile({
    appSecrets: new Array(4).fill().map(() => crypto.randomBytes(16).toString('base64')).join(','),
  });
};
