'use strict';

const fp = require('lodash/fp');

const { generateAttributesDefinition } = require('./attributes');
const { addImport } = require('./imports');
const { mapKeyValuesToType } = require('./utils');

const generateComponentDefinition = (uid, schema, type) => {
  addImport('ComponentSchema');

  const componentInfo = mapKeyValuesToType(schema.info, 'info', 2);
  const componentOptions = mapKeyValuesToType(schema.options, 'options', 2);
  const componentPluginOptions = mapKeyValuesToType(schema.pluginOptions, 'pluginOptions', 2);

  const componentAttributes = generateAttributesDefinition(schema.attributes, uid);

  const definitions = [componentInfo, componentOptions, componentPluginOptions, componentAttributes]
    .filter(def => !fp.isNil(def))
    .join('\n');

  return `
interface ${type} extends ComponentSchema {
${definitions}
}`;
};

module.exports = {
  generateComponentDefinition,
};
