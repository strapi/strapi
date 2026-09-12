import chalk from 'chalk';
import { has } from 'lodash/fp';

// TODO: Remove duplicated code by extracting to a shared package

const assertCwdContainsStrapiProject = (name: string) => {
  const logErrorAndExit = () => {
    console.log(
      `You need to run ${chalk.yellow(
        `strapi ${name}`
      )} in a Strapi project. Make sure you are in the right directory.`
    );
    process.exit(1);
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkgJSON = require(`${process.cwd()}/package.json`);
    if (
      !has('dependencies.@strapi/strapi', pkgJSON) &&
      !has('devDependencies.@strapi/strapi', pkgJSON)
    ) {
      logErrorAndExit();
    }
  } catch {
    logErrorAndExit();
  }
};

const runAction = (name: string, action: (...args: any[]) => Promise<unknown>) => {
  // NOTE: Commander binds the Command to the action handler. Keep it a regular function.
  return function handler(...args: unknown[]) {
    assertCwdContainsStrapiProject(name);

    Promise.resolve()
      .then(() => action(...args))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  };
};

export { runAction };
