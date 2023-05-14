import { red, green, bold, yellow } from 'chalk';
import semver from 'semver';
import engines from '../resources/json/common/engines';

export default function checkRequirements() {
  const currentNodeVersion = process.versions.node;

  // error if the node version isn't supported
  if (!semver.satisfies(currentNodeVersion, engines.node)) {
    console.error(red(`You are running ${bold(`Node.js ${currentNodeVersion}`)}`));
    console.error(`Strapi requires ${bold(green(`Node.js ${engines.node}`))}`);
    console.error('Please make sure to use the right version of Node.');
    process.exit(1);
  }

  // warn if not using a LTS version
  else if (semver.satisfies(currentNodeVersion, '15.x.x || 17.x.x || 19.x.x')) {
    console.warn(yellow(`You are running ${bold(`Node.js ${currentNodeVersion}`)}`));
    console.warn(
      `Strapi only supports ${bold(
        green('LTS versions of Node.js')
      )}, other versions may not be compatible.`
    );
  }
}
