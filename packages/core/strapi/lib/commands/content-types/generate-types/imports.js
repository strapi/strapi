'use strict';

const imports = [];

module.exports = {
  getImports() {
    return imports;
  },

  addImport(type) {
    const hasType = imports.includes(type);

    if (!hasType) {
      imports.push(type);
    }
  },

  generateImports() {
    const formattedImports = imports.map(p => `  ${p}`).join(',\n');

    return `import {
${formattedImports}
} from '@strapi/strapi'; 
`;
  },
};
