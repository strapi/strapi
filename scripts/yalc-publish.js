'use strict';

const { join } = require('path');
const execa = require('execa');
const fs = require('fs-extra');

async function run() {
  const proc = await execa('yarn', ['workspaces', 'list', '--json', '--no-private'], {
    cwd: join(__dirname, '..'),
  });

  const packagesDirs = proc.stdout
    .trim()
    .split('\n')
    .map((info) => JSON.parse(info).location);

  await Promise.all(
    packagesDirs.map(async (dir) => {
      await execa('npx', ['yalc', 'push', '--no-scripts', dir], {
        stdio: 'inherit',
        cwd: join(__dirname, '..'),
      });
    })
  );
}

run().catch((err) => console.error(err));
