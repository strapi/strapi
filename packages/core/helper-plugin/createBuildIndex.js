const fs = require('fs-extra');
const path = require('path');

const content = `
'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./helper-plugin.production.js");
} else {
  module.exports = require("./helper-plugin.development.js");
}
`;

const createIndexFile = async (dest) => {
  await fs.ensureDir(path.resolve(dest, 'build'));
  fs.writeFile(path.resolve(dest, 'build', 'index.js'), content);
};

createIndexFile(__dirname);
