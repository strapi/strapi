import { styleText } from 'node:util';
import semver from 'semver';

import { engines } from './engines';
import { logger } from './logger';

export function checkNodeRequirements() {
  const currentNodeVersion = process.versions.node;
  const nodeMajor = semver.major(currentNodeVersion);

  // error if the node version isn't supported
  if (!semver.satisfies(currentNodeVersion, engines.node)) {
    logger.fatal([
      styleText('red', `You are running ${styleText('bold', `Node.js ${currentNodeVersion}`)}`),
      `Strapi requires ${styleText('bold', styleText('green', `Node.js ${engines.node}`))}`,
      'Please make sure to use the right version of Node.',
    ]);
  }

  // warn if not using a LTS version (odd majors are non-LTS before Node 26)
  else if (nodeMajor < 26 && nodeMajor % 2 !== 0) {
    logger.warn([
      styleText('yellow', `You are running ${styleText('bold', `Node.js ${currentNodeVersion}`)}`),
      `Strapi only supports ${styleText('bold', styleText('green', 'LTS versions of Node.js'))}, other versions may not be compatible.`,
    ]);
  }
}
