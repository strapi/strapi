'use strict';

/**
 * Expose main package JSON of the application
 * with basic info, dependencies, etc.
 */

module.exports = opts => {
  const {
    strapiDependencies,
    additionalsDependencies,
    strapiVersion,
    projectName,
    uuid,
  } = opts;

  // Finally, return the JSON.
  return {
    name: projectName,
    private: true,
    version: '0.1.0',
    description: 'A Strapi application',
    scripts: {
      develop: 'strapi develop',
      start: 'strapi start',
      build: 'strapi build',
      strapi: 'strapi', // Allow to use `npm run strapi` CLI,
      lint: 'eslint api/**/*.js config/**/*.js plugins/**/*.js',
    },
    devDependencies: {
      'babel-eslint': '^7.1.1',
      eslint: '^4.19.1',
      'eslint-config-airbnb': '^13.0.0',
      'eslint-plugin-import': '^2.11.0',
      'eslint-plugin-react': '^7.7.0',
    },
    dependencies: Object.assign(
      { lodash: '^4.17.5' },
      strapiDependencies.reduce((acc, key) => {
        acc[key] = strapiVersion;
        return acc;
      }, {}),
      additionalsDependencies
    ),
    author: {
      name: 'A Strapi developer',
    },
    strapi: {
      uuid: uuid,
    },
    engines: {
      node: '^10.0.0',
      npm: '>= 6.0.0',
    },
    license: 'MIT',
  };
};
