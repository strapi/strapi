/**
 * componentExists
 *
 * Check whether the given component exist in either the components or containers directory
 */

const fs = require('fs');
const path = require('path');

const pageComponents = fs.readdirSync(path.resolve(process.cwd(), 'admin', 'src', 'components'));
const pageContainers = fs.readdirSync(path.resolve(process.cwd(), 'admin', 'src', 'containers'));
const components = pageComponents.concat(pageContainers);

function componentExists(comp) {
  return components.indexOf(comp) >= 0;
}

module.exports = componentExists;
