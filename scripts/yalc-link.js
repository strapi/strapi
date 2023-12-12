'use strict';

const { join } = require('path');
const { promisify } = require('util');
const execa = require('execa');
const fs = require('fs-extra');
const glob = promisify(require('glob').glob);

async function run() {
  const proc = await execa('yarn', ['workspaces', 'list', '--json', '--no-private'], {
    cwd: join(__dirname, '..'),
  });

  const packages = proc.stdout
    .trim()
    .split('\n')
    .map((info) => JSON.parse(info).name);

  await execa('npx', ['yalc', 'link', ...packages], { stdio: 'inherit' });
}

run().catch((err) => console.error(err));
