'use strict';

const _ = require('lodash');
const crypto = require('crypto');

const fs = require('fs');
const path = require('path');

module.exports = () => {
  const tmpl = fs.readFileSync(path.join(__dirname, `server.template`));
  const compile = _.template(tmpl);

  return compile({
    adminJwtToken: crypto.randomBytes(16).toString('hex'),
  });
};
