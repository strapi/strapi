const fs = require('fs-extra');
const path = require('path');
const entries = require('./getLibEntries');

const createIndexFile = fileName => {
  const content = `
'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./${fileName}.production.js");
} else {
  module.exports = require("./${fileName}.development.js");
}
`;

  fs.writeFile(path.resolve(__dirname, 'build', `${fileName}.js`), content);
};

Object.keys(entries).forEach(fileName => {
  createIndexFile(fileName);
});
