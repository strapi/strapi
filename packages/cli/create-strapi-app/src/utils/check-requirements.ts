import chalk from 'chalk';
import semver from 'semver';

import { engines } from './engines';
import { stopProcess } from './stop-process';

export function checkNodeRequirements() {
  const currentNodeVersion = process.versions.node;

  // error if the node version isn't supported
  if (!semver.satisfies(currentNodeVersion, engines.node)) {
    console.error(chalk.red(`You are running ${chalk.bold(`Node.js ${currentNodeVersion}`)}`));
    console.error(`Strapi requires ${chalk.bold(chalk.green(`Node.js ${engines.node}`))}`);
    console.error('Please make sure to use the right version of Node.');
    stopProcess();
  }

  // warn if not using a LTS version
  else if (semver.major(currentNodeVersion) % 2 !== 0) {
    console.warn(chalk.yellow(`You are running ${chalk.bold(`Node.js ${currentNodeVersion}`)}`));
    console.warn(
      `Strapi only supports ${chalk.bold(
        chalk.green('LTS versions of Node.js')
      )}, other versions may not be compatible.`
    );
  }
}
