'use strict';

const crypto = require('crypto');

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const generateASecret = () => crypto.randomBytes(16).toString('base64');

module.exports = () => {
  const tmpl = fs.readFileSync(path.join(__dirname, 'env.template'));
  const compile = _.template(tmpl);

  return compile({
    appKeys: new Array(4).fill().map(generateASecret).join(','),
    apiTokenSalt: generateASecret(),
    transferTokenSalt: generateASecret(),
    adminJwtToken: generateASecret(),
  });
};
