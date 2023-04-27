import { Scope } from '../../../types';
import engines from './engines';

type OptsScope = Pick<
  Scope,
  'strapiDependencies' | 'additionalsDependencies' | 'strapiVersion' | 'uuid' | 'packageJsonStrapi'
>;

interface Opts extends OptsScope {
  projectName: string;
}

export default (opts: Opts) => {
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
      ...strapiDependencies.reduce<Record<string, string>>((acc, key) => {
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
    engines,
    license: 'MIT',
  };
};
