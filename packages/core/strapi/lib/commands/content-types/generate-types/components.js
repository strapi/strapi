'use strict';

const { generateAttributesDefinition } = require('./attributes');
const { addImport } = require('./imports');

const generateComponentDefinition = (uid, schema, type) => {
  addImport('ComponentSchema');

  const componentAttributes = generateAttributesDefinition(schema.attributes, uid);

  return `
interface ${type} extends ComponentSchema {
  attributes: {
${componentAttributes}
  }
}
`;
};

module.exports = {
  generateComponentDefinition,
};
