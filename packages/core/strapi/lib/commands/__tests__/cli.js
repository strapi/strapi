'use strict';

const { runCommand } = require('../index');

const makeArgv = () => {
  console.log('arguments', Array.from(arguments));
  return ['', ''];
};

describe('strapi command', () => {
  it('works', async () => {
    await runCommand({
      ...process,
      argv: makeArgv('version'),
      exit(code) {
        console.log('exit with code', code);
      },
    });
  });
});
