'use strict';

const generateGlobalDefinition = definitions => {
  const formattedSchemasDefinitions = definitions
    .map(({ uid, type }) => `      '${uid}': ${type}`)
    .join('\n');

  return `
declare global {
  namespace Strapi {
    interface Schemas {
${formattedSchemasDefinitions}
    }
  }
}
`;
};

module.exports = {
  generateGlobalDefinition,
};
