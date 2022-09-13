'use strict';

/**
 * Expose main package JSON of the application
 * with basic info, dependencies, etc.
 */

module.exports = (opts) => {
  const {
    strapiDependencies,
    additionalsDependencies,
    strapiVersion,
    projectName,
    uuid,
    packageJsonStrapi,
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
      strapi: 'strapi',
    },
    devDependencies: {},
    dependencies: {
      ...strapiDependencies.reduce((acc, key) => {
        acc[key] = strapiVersion;
        return acc;
      }, {}),
      ...additionalsDependencies,
    },
    author: {
      name: 'A Strapi developer',
    },
    strapi: {
      uuid,
      ...packageJsonStrapi,
    },
    engines: {
      node: '>=14.19.1 <=16.x.x',
      npm: '>=6.0.0',
    },
    license: 'MIT',
  };
};
