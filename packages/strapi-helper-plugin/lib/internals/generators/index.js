/**
 * generator/index.js
 *
 * Exports the generators so plop knows them
 */

const fs = require('fs');
const path = require('path');

const componentGenerator = require('./component/index.js');
const containerGenerator = require('./container/index.js');

module.exports = (plop) => {
  plop.setGenerator('component', componentGenerator);
  plop.setGenerator('container', containerGenerator);
  plop.addHelper('directory', (comp) => {
    try {
      fs.accessSync(`${path.resolve(process.cwd(), 'admin', 'src', 'containers', comp)}`, fs.F_OK);
      return `${path.resolve(process.cwd(), 'admin', 'src', 'containers', comp)}`;
    } catch (e) {
      return `${path.resolve(process.cwd(), 'admin', 'src', 'components', comp)}`;
    }
  });
  plop.addHelper('curly', (object, open) => (open ? '{' : '}'));
};
