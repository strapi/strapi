'use strict';

const { execSync } = require(`child_process`);
const execa = require('execa');
const fs = require('fs-extra');
const uuid = require('uuid');
const chalk = require('chalk');
const unzip = require('unzip');
const promptPackageManager = require('./utils/promptPackageManager');

// Return the selected package manager
const setPackageManager = async () => {
  return await promptPackageManager();
};

const checkGitIsInstalled = async () => {
  console.log(chalk.yellow('Checking if git is installed...'));
  try {
    await execa('git', ['--version']);
  } catch (e) {
    return !e.failed;
  }
  return true;
};

const cloneRepository = async (repository, destination) => {
  console.log(chalk.yellow('Cloning the repository from Github...'));
  await execa('git', ['clone', repository, destination, '--depth', 1], {
    stdio: 'inherit',
  });
};

const downloadProject = async (
  archive,
  archiveName,
  destination,
  destinationName
) => {
  console.log(chalk.yellow('Downloading the project from Github archive...'));
  await execa('curl', [archive, '-O', '-J', '-L'], {
    stdio: 'inherit',
  });

  destination = destination.replace(destinationName, archiveName);
  destinationName = archiveName;

  await fs
    .createReadStream(`${destination}.zip`)
    .pipe(unzip.Extract({ path: '.' }));

  if (fs.existsSync(`${destination}.zip`)) {
    await execa('rm', [`${destination}.zip`]);
  }
  return [destination, destinationName];
};

const manageGitConfigs = async destination => {
  // Remove .git folder
  try {
    if (fs.existsSync(destination)) {
      await fs.removeSync(`${destination}/.git`);
    }
  } catch (e) {
    console.log(e);
  }
};

const installDependencies = async (packageManager, destination) => {
  console.log(chalk.yellow('\nInstalling dependencies...'));

  var args = [`setup-${packageManager}`];
  if (packageManager == 'npm') args.unshift('run');
  await execa('yarn', args, {
    stdio: 'inherit',
    cwd: destination,
  });
};

const updateUuid = async destination => {
  // Path of the package.json file
  const filePath = `${destination}/backend/package.json`;

  // Check if the package.json exist
  try {
    if (fs.existsSync(filePath)) {
      // Read the package.json inside the backend directory (strapi)
      const packageJSON = await fs.readJSON(
        `${destination}/backend/package.json`
      );

      // Change the uuid inside the package.json
      await fs.writeJson(filePath, {
        ...packageJSON,
        strapi: { uuid: uuid() },
      });
    }
  } catch (e) {
    console.error(e);
  }
};

const iniGitRepository = async (destination, destinationName) => {
  console.log(`${chalk.yellow(`Initialising git in`)} ${destinationName}`);

  return await execa(`git`, [`init`], { cwd: destination });
};

const createInitialGitCommit = async (
  destination,
  destinationName,
  repository
) => {
  console.log(
    `${chalk.yellow(`Create initial git commit in`)} ${destinationName}`
  );

  await execa(`git`, [`add`, `-A`], { cwd: destination });
  // use execSync instead of spawn to handle git clients using
  // pgp signatures (with password)
  try {
    execSync(`git commit -m "Initial commit from strapi: (${repository})"`, {
      cwd: destination,
    });
  } catch {
    // Remove git support if intial commit fails
    console.log(`Initial git commit failed - removing git support\n`);
    fs.removeSync(`${destination}/.git`);
  }
};

const runSeed = async (packageManager, destination) => {
  console.log(chalk.yellow(`Creating content types...`));
  var args = [`seed`];
  if (packageManager == 'npm') args.unshift('run');
  await execa(packageManager, args, {
    cwd: `${destination}/backend`,
  });
};

const getScripts = async destination => {
  const backendFile = `${destination}/backend/package.json`;
  const frontendFile = `${destination}/frontend/package.json`;

  // Read the package.json inside the backend directory (strapi)
  const packageJsonBackend = await fs.readJSON(backendFile);
  const packageJsonFrontend = await fs.readJSON(frontendFile);

  return [packageJsonBackend.scripts, packageJsonFrontend.scripts];
};

const successMessage = async (
  destinationName,
  backendScripts,
  frontendScripts,
  packageManager
) => {
  var npm = packageManager == 'npm' ? 'run' : '';

  console.log(`${chalk.green('\nSuccess!')} Cloned ${destinationName}`);
  console.log(
    `Inside that directory, you can run both of your frontend and backend server:
  ${chalk.yellow(`\nYou should start by running your strapi server`)}

  backend

  ${chalk.cyan(`cd ${destinationName}/backend`)}`
  );
  for (var key in backendScripts) {
    console.log(`  ${chalk.cyan(`${packageManager} ${npm} ${key}`)}`);
  }
  console.log(`

  -------------

  frontend

  ${chalk.cyan(`cd ${destinationName}/frontend`)}`);
  for (var key2 in frontendScripts) {
    console.log(`  ${chalk.cyan(`${packageManager} ${npm} ${key2}`)}`);
  }
  console.log(`
  Thanks for giving this starter a try!
  `);
};

module.exports = async function createStarterProject(scope) {
  // yarn or npm
  const packageManager = await setPackageManager();

  // Repository url and destination sent in args
  const repository = scope.starter;
  if (repository === undefined) {
    console.error('Please specify the <repository> of your starter');
    process.exit(1);
  }

  let destination = scope.rootPath;
  let destinationName = scope.name;

  let backendScripts = '';
  let frontendScripts = '';

  // Archive from the github url
  const archive = repository.replace('.git', '/archive/master.zip');
  const archiveName = archive.split('/')[4].concat('-master');

  let hasGit = await checkGitIsInstalled();

  // If git is installed, clone the repository, else download the project
  if (hasGit) {
    await cloneRepository(repository, destination);
  } else {
    [destination, destinationName] = await downloadProject(
      archive,
      archiveName,
      destination,
      destinationName
    );
  }

  // Remove .git folder
  if (hasGit) await manageGitConfigs(destination);

  // Install dependencies thanks to the package.json inside the starter repo
  await installDependencies(packageManager, destination);
  await updateUuid(destination);
  await runSeed(packageManager, destination);
  await iniGitRepository(destination, destinationName);
  await createInitialGitCommit(destination, destinationName, repository);
  [backendScripts, frontendScripts] = await getScripts(destination);
  await successMessage(
    destinationName,
    backendScripts,
    frontendScripts,
    packageManager
  );
};
