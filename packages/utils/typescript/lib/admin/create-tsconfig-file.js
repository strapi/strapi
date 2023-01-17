'use strict';

const path = require('path');
const fs = require('fs-extra');

module.exports = async (dest) => {
  const tsConfig = {
    compilerOptions: {
      lib: ['es2019', 'es2020.promise', 'es2020.bigint', 'es2020.string', 'DOM'],
      noImplicitAny: false,
      module: 'es2020',
      target: 'es5',
      jsx: 'react',
      allowJs: true,
      strict: true,
      moduleResolution: 'node',
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      noEmit: false,
      incremental: true,
    },
    include: ['../../../src/admin/*', '../../../src/**/**/admin/src/*'],
    exclude: ['node_modules', '**/*.test.js', '*.js'],
  };

  const filePath = path.join(dest, 'admin', 'src', 'tsconfig.json');

  try {
    await fs.ensureFile(filePath);

    await fs.writeJSON(filePath, tsConfig, { spaces: 2 });
  } catch (err) {
    console.log(err);
  }
};
