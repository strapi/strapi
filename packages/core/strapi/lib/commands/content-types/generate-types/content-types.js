'use strict';

const fp = require('lodash/fp');

const { generateAttributesDefinition } = require('./attributes');
const { addImport } = require('./imports');
const { mapKeyValuesToType } = require('./utils');

const generateContentTypeDefinition = (uid, schema, type) => {
  const { kind } = schema;
  const baseInterface = `${fp.upperFirst(kind)}Schema`;

  addImport(baseInterface);

  const contentTypeInfo = mapKeyValuesToType(schema.info, 'info', 2);
  const contentTypeOptions = mapKeyValuesToType(schema.options, 'options', 2);
  const contentTypePluginOptions = mapKeyValuesToType(schema.pluginOptions, 'pluginOptions', 2);

  const contentTypeAttributes = generateAttributesDefinition(schema.attributes, uid);

  const definitions = [
    contentTypeInfo,
    contentTypeOptions,
    contentTypePluginOptions,
    contentTypeAttributes,
  ]
    .filter(def => !fp.isNil(def))
    .join('\n');

  return `
interface ${type} extends ${baseInterface} {
${definitions}
}`;
};

module.exports = { generateContentTypeDefinition };
