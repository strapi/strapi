/**
 * generator/index.js
 *
 * Exports the generators so plop knows them
 */

const fs = require('fs');
const path = require('path');

const componentGenerator = require('./component/index.js');
const containerGenerator = require('./container/index.js');
const routeGenerator = require('./route/index.js');
const languageGenerator = require('./language/index.js');

module.exports = (plop) => {
  plop.setGenerator('component', componentGenerator);
  plop.setGenerator('container', containerGenerator);
  plop.setGenerator('route', routeGenerator);
  plop.setGenerator('language', languageGenerator);
  plop.addHelper('directory', (comp) => {
    console.log('-----------------------------------------------')
    console.log(path.resolve(process.cwd(), 'app', 'containers', comp))
    console.log('-----------------------------------------------')
    try {
      fs.accessSync(`${path.resolve(process.cwd(), 'app', 'containers', comp)}`, fs.F_OK);
      return `${path.resolve(process.cwd(), 'app', 'containers', comp)}`;
    } catch (e) {
      return `${path.resolve(process.cwd(), 'app', 'components', comp)}`;
    }
  });
  plop.addHelper('curly', (object, open) => (open ? '{' : '}'));
};
