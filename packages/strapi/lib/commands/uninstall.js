'use strict';

const { join } = require('path');
const { existsSync, rmdirSync } = require('fs-extra');
const ora = require('ora');
const execa = require('execa');
const { cyan } = require('chalk');
const inquirer = require('inquirer');
const { cli } = require('strapi-utils');
const findPackagePath = require('../load/package-path');

module.exports = async (plugins, { deleteFiles }) => {
  if (!cli.isStrapiApp()) {
    return console.log(
      `⛔️ ${cyan('strapi install')} can only be used inside a Strapi project.`
    );
  }

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'deleteFiles',
      message: `Do you want to delete the plugin generated files in the extensions folder ?`,
      default: true,
      when: !deleteFiles,
    },
  ]);

  const loader = ora();
  const dir = process.cwd();

  const pluginArgs = plugins.map(name => `strapi-plugin-${name}`);

  try {
    // verify should rebuild before removing the pacakge
    let shouldRebuild = false;
    for (let name of plugins) {
      let pkgPath = findPackagePath(`strapi-plugin-${name}`);
      if (existsSync(join(pkgPath, 'admin', 'src', 'index.js'))) {
        shouldRebuild = true;
      }
    }

    loader.start(`Uninstalling dependencies`);

    const useYarn = existsSync(join(dir, 'yarn.lock'));
    if (useYarn) {
      await execa('yarn', ['remove', ...pluginArgs]);
    } else {
      await execa('npm', ['remove', ...pluginArgs]);
    }

    loader.succeed();

    if (deleteFiles === true || answers.deleteFiles === true) {
      loader.start('Deleting old files');
      for (let name of plugins) {
        const pluginDir = join(dir, 'extensions', name);
        if (existsSync(pluginDir)) {
          rmdirSync();
        }
      }
      loader.succeed();
    }

    if (shouldRebuild) {
      loader.start(`Rebuilding admin UI`);
      await execa('npm', ['run', 'build']);
      loader.succeed();
    }
  } catch (err) {
    loader.clear();
    console.error(err.message);
    process.exit(1);
  }
};
