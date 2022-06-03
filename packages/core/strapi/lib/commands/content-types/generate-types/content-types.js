'use strict';

const fp = require('lodash/fp');

const { generateAttributesDefinition } = require('./attributes');
const { addImport } = require('./imports');

const generateContentTypeDefinition = (uid, schema, type) => {
  const { kind } = schema;
  const baseInterface = `${fp.upperFirst(kind)}Schema`;

  addImport(baseInterface);

  const contentTypeAttributes = generateAttributesDefinition(schema.attributes, uid);

  return `
interface ${type} extends ${baseInterface} {
  attributes: {
${contentTypeAttributes}
  }
}
`;
};

module.exports = { generateContentTypeDefinition };
