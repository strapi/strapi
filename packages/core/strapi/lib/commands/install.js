'use strict';

const { join } = require('path');
const { existsSync } = require('fs-extra');
const ora = require('ora');
const execa = require('execa');

module.exports = async plugins => {
  const loader = ora();
  const dir = process.cwd();

  const version = require(join(dir, 'package.json')).dependencies['@strapi/strapi'];

  const pluginArgs = plugins.map(name => `@strapi/plugin-${name}@${version}`);

  try {
    loader.start(`Installing dependencies`);

    const useYarn = existsSync(join(dir, 'yarn.lock'));
    if (useYarn) {
      await execa('yarn', ['add', ...pluginArgs]);
    } else {
      await execa('npm', ['install', '--save', ...pluginArgs]);
    }

    loader.succeed();
  } catch (err) {
    loader.clear();
    console.error(err.message);
    process.exit(1);
  }
};
