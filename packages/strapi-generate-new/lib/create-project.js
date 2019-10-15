'use strict';

const { join } = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');
const execa = require('execa');
const ora = require('ora');

const stopProcess = require('./utils/stop-process');
const { trackUsage, captureStderr } = require('./utils/usage');
const packageJSON = require('./resources/json/package.json');
const databaseJSON = require('./resources/json/database.json.js');

module.exports = async function createProject(
  scope,
  { connection, dependencies }
) {
  console.log('Creating files.');

  const { rootPath } = scope;
  const resources = join(__dirname, 'resources');

  try {
    // copy files
    await fse.copy(join(resources, 'files'), rootPath);

    // copy dot files
    const dotFiles = await fse.readdir(join(resources, 'dot-files'));
    await Promise.all(
      dotFiles.map(name => {
        return fse.copy(
          join(resources, 'dot-files', name),
          join(rootPath, `.${name}`)
        );
      })
    );

    // copy templates
    await fse.writeJSON(
      join(rootPath, 'package.json'),
      packageJSON({
        strapiDependencies: scope.strapiDependencies,
        additionalsDependencies: dependencies,
        strapiVersion: scope.strapiVersion,
        projectName: scope.name,
        uuid: scope.uuid,
      }),
      {
        spaces: 2,
      }
    );

    // ensure node_modules is created
    await fse.ensureDir(join(rootPath, 'node_modules'));

    await Promise.all(
      ['development', 'staging', 'production'].map(env => {
        return fse.writeJSON(
          join(rootPath, `config/environments/${env}/database.json`),
          databaseJSON({
            connection,
            env,
          }),
          { spaces: 2 }
        );
      })
    );
  } catch (err) {
    await fse.remove(scope.rootPath);
    throw err;
  }

  const installPrefix = chalk.yellow('Installing dependencies:');
  const loader = ora(installPrefix).start();

  const logInstall = (chunk = '') => {
    loader.text = `${installPrefix} ${chunk
      .toString()
      .split('\n')
      .join(' ')}`;
  };

  try {
    if (scope.installDependencies !== false) {
      const runner = runInstall(scope);

      runner.stdout.on('data', logInstall);
      runner.stderr.on('data', logInstall);

      await runner;
    }

    loader.stop();
    console.log(`Dependencies installed ${chalk.green('successfully')}.`);
  } catch (error) {
    loader.stop();
    await trackUsage({
      event: 'didNotInstallProjectDependencies',
      scope,
      error: error.stderr.slice(-1024),
    });

    console.error(`${chalk.red('Error')} while installing dependencies:`);
    console.error(error.stderr);

    await captureStderr('didNotInstallProjectDependencies', error);

    stopProcess('Stopping installation');
  }

  await trackUsage({ event: 'didCreateProject', scope });

  console.log();
  console.log(`Your application was created at ${chalk.green(rootPath)}.\n`);

  const cmd = chalk.cyan(scope.useYarn ? 'yarn' : 'npm run');

  console.log('Available commands in your project:');
  console.log();
  console.log(`  ${cmd} develop`);
  console.log('  Start Strapi in watch mode.');
  console.log();
  console.log(`  ${cmd} start`);
  console.log('  Start Strapi without watch mode.');
  console.log();
  console.log(`  ${cmd} build`);
  console.log('  Build Strapi admin panel.');
  console.log();
  console.log(`  ${cmd} strapi`);
  console.log(`  Display all available commands.`);
  console.log();
  console.log('You can start by doing:');
  console.log();
  console.log(`  ${chalk.cyan('cd')} ${rootPath}`);
  console.log(`  ${cmd} develop`);
  console.log();
};

const installArguments = ['install', '--production', '--no-optional'];
function runInstall({ rootPath, useYarn }) {
  if (useYarn) {
    return execa('yarnpkg', installArguments, {
      cwd: rootPath,
      stdin: 'ignore',
    });
  }

  return execa('npm', installArguments, { cwd: rootPath, stdin: 'ignore' });
}
