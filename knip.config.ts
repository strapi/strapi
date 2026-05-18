import type { KnipConfig, KnipConfiguration } from 'knip';

const commonJest: KnipConfiguration['jest'] = {
  config: ['jest.config.js', 'jest.config.front.js'],
};

const commonTypeScript: KnipConfiguration['typescript'] = {
  config: [
    'tsconfig.json',
    'tsconfig.build.json',
    'tsconfig.eslint.json',
    'admin/tsconfig.json',
    'admin/tsconfig.build.json',
    'admin/tsconfig.eslint.json',
    'server/tsconfig.json',
    'server/tsconfig.build.json',
    'server/tsconfig.eslint.json',
  ],
};

const commonEslint: KnipConfiguration['eslint'] = {
  config: [
    '.eslintrc.cjs',
    'admin/.eslintrc.cjs',
    'server/.eslintrc.cjs',
    'ee/.eslintrc.cjs',
    'ee/admin/.eslintrc.cjs',
    'ee/server/.eslintrc.cjs',
  ],
};

const config: KnipConfig = {
  $schema: 'node_modules/knip/schema.json',
  tags: ['-knipignore'],
  ignore: [
    // Misc. Enable and configure if desired
    'examples/**',
    'tests/**',
    'templates/**',
    '.github/**',
    'scripts/**',
    'docs/**',
  ],
  exclude: [
    // TODO: Fix when desired
    'exports',
    'types',
    'namespaceMembers',
    'enumMembers',
  ],
  workspaces: {
    '.': {
      entry: ['jest.config.api.js', 'jest.config.cli.js'],
      ignoreBinaries: [
        'run', // yarn run
        'pinst', // yarn pinst
      ],
      ignoreDependencies: [
        // Known issue. In a monorepo, the eslint-config workspace cannot declare it's dependencies
        // Fix: ESLint Flat config, or use https://github.com/microsoft/rushstack/tree/main/eslint/eslint-patch#modern-module-resolution-feature
        'core-js',
        'eslint-config-airbnb',
        'eslint-config-airbnb-base',
        'eslint-config-airbnb-typescript',
        'eslint-config-prettier',
        'eslint-import-resolver-typescript',
        'eslint-plugin-check-file',
        'eslint-plugin-import',
        'eslint-plugin-jest-dom',
        'eslint-plugin-jsx-a11y',
        'eslint-plugin-node',
        'eslint-plugin-prettier',
        'eslint-plugin-react',
        'eslint-plugin-react-hooks',
        'eslint-plugin-testing-library',

        // Used by tests/**
        'stream-chain',
        'stream-json',
        'supertest',
        'tar',
        'coffee',

        'yalc', // Used by scripts/**
        '@nx/js', // Used by nx.json
      ],
    },

    // CLI

    'packages/cli/*': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
    },

    'packages/cli/create-strapi-app': {
      eslint: commonEslint,
      typescript: commonTypeScript,
      ignoreFiles: ['templates/**'],
    },

    // CORE

    'packages/core/*': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
    },

    'packages/core/admin': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      entry: [
        'admin/*.d.ts',
        'ee/admin/*.d.ts',
        'server/src/utils/index.d.ts',
        'admin/src/translations/en-GB.js',
      ],
      ignoreDependencies: [
        // TODO: Remove when fixed https://github.com/strapi/strapi/pull/26189
        'punycode',
        '@types/punycode',
      ],
    },

    'packages/core/content-manager': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      entry: ['admin/*.d.ts'],
    },

    'packages/core/content-releases': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      entry: ['admin/*.d.ts', 'server/*.d.ts'],
    },

    'packages/core/content-type-builder': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      entry: ['admin/*.d.ts'],
    },

    'packages/core/core': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      ignoreDependencies: [
        // TODO: Remove when fixed https://github.com/gajus/global-agent/issues/80
        '@types/global-agent',
        // Runtime resolved. Creates circular dependencies if added
        '@strapi/strapi',
      ],
    },

    'packages/core/email': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      ignoreDependencies: [
        // @strapi/email default provider
        '@strapi/provider-email-sendmail',
      ],
    },

    'packages/core/review-workflows': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      entry: ['admin/*.d.ts'],
    },

    'packages/core/upload': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      entry: ['admin/*.d.ts'],
      ignoreDependencies: [
        // @strapi/upload default provider
        '@strapi/provider-upload-local',
      ],
    },

    'packages/core/utils': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      ignoreFiles: [
        // TODO: Figure out
        'src/__tests__/import-default/cjs.js',
        'src/__tests__/import-default/esm.js',
      ],
    },

    // PLUGINS

    'packages/plugins/*': {
      jest: commonJest,
      eslint: commonEslint,
      typescript: commonTypeScript,
    },

    'packages/plugins/cloud': {
      typescript: commonTypeScript,
      eslint: commonEslint,
      entry: ['admin/*.d.ts'],
    },

    'packages/plugins/documentation': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      entry: ['admin/src/*.d.ts', 'server/src/*.d.ts'],
    },

    'packages/plugins/i18n': {
      jest: commonJest,
      typescript: commonTypeScript,
      eslint: commonEslint,
      entry: ['admin/*.d.ts'],
    },

    'packages/plugins/users-permissions': {
      jest: commonJest,
      eslint: commonEslint,
      entry: [
        // TODO: Remove when workspace is migrated to TypeScript
        'server/utils/index.d.ts',
      ],
    },

    // UTILS

    'packages/utils/api-tests': {
      entry: ['*.js', 'builder/index.js'],
    },

    'packages/utils/eslint-config-custom': {
      entry: ['**/*.js'],
    },

    'packages/utils/upgrade': {
      jest: commonJest,
      eslint: commonEslint,
      typescript: commonTypeScript,
      entry: ['resources/codemods/**/*.ts', 'resources/examples/*.ts'],
    },
  },
};

export default config;
