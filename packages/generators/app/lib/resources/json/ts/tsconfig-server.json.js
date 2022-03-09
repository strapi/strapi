'use strict';

module.exports = () => ({
  compilerOptions: {
    lib: ['es2019', 'es2020.promise', 'es2020.bigint', 'es2020.string'],
    module: 'commonjs',
    target: 'es2019',
    strict: false,
    noImplicitAny: false,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    allowJs: true,
    outDir: 'dist',
    rootDir: '.',
    noEmitOnError: true,
  },

  exclude: ['node_modules/', 'dist/', 'src/admin', 'src/plugins/**/admin'],
});
