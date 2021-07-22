'use strict';

const fs = require('fs');
const { join } = require('path');

const packagesFolder = join(__dirname, '../../../');

const fileExistsInPackages = path =>
  fs.promises
    .access(join(packagesFolder, path))
    .then(() => true)
    .catch(() => false);

module.exports = fileExistsInPackages;
