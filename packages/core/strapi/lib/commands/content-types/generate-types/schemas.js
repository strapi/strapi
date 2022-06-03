'use strict';

const fp = require('lodash/fp');

const { generateAttributesDefinition } = require('./attributes');
const { addImport } = require('./imports');
const { toType } = require('./utils');

const getBaseSchema = schema => {
  const { modelType, kind } = schema;

  // Component
  if (modelType === 'component') {
    return 'ComponentSchema';
  }

  // Content Type
  else if (modelType === 'contentType') {
    return `${fp.upperFirst(kind)}Schema`;
  }

  return null;
};

const getFormatOptions = prefix => ({ indentStart: 2, suffix: ';', prefix });

const generateSchemaDefinition = (uid, schema, type) => {
  const baseInterface = getBaseSchema(schema);

  addImport(baseInterface);

  const propertiesKeys = ['info', 'options', 'pluginOptions'];

  const definitionBody = propertiesKeys
    .map(key => toType(fp.get(key, schema), getFormatOptions(key)))
    .concat(generateAttributesDefinition(schema.attributes, uid))
    .filter(def => !fp.isNil(def))
    .join('');

  return `interface ${type} extends ${baseInterface} {\n${definitionBody}\n}`;
};

module.exports = {
  generateSchemaDefinition,
};
