export const PROJECT_PACKAGE_JSON = 'package.json';

export const PROJECT_DEFAULT_ALLOWED_ROOT_PATHS = ['src', 'config', 'public', 'admin', 'server'];

export const PROJECT_DEFAULT_CODE_EXTENSIONS = [
  // Source files
  'js',
  'mjs',
  'ts',
  // React files
  'jsx',
  'tsx',
];

export const PROJECT_DEFAULT_JSON_EXTENSIONS = ['json'];

export const PROJECT_DEFAULT_ALLOWED_EXTENSIONS = [
  ...PROJECT_DEFAULT_CODE_EXTENSIONS,
  ...PROJECT_DEFAULT_JSON_EXTENSIONS,
];

export const PROJECT_DEFAULT_PATTERNS = ['package.json'];

export const SCOPED_STRAPI_PACKAGE_PREFIX = '@strapi/';

export const STRAPI_DEPENDENCY_NAME = `${SCOPED_STRAPI_PACKAGE_PREFIX}strapi`;
