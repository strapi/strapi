'use strict';

const execa = require('execa');
const fs = require('fs-extra');
const uuid = require('uuid/v4');

module.exports = async function createStarterProject(scope) {
  console.log('Creating a starter project.');

  // Name of the repository
  const repository = scope.starter;
  const destination = scope.rootPath;
  const destinationName = scope.name;

  // Clone the starter repository
  await execa('git', ['clone', repository, destination], {
    stdio: 'inherit',
  });

  // Install dependencies thanks to the package.json inside the starter repo
  await execa('yarn', ['setup'], {
    stdio: 'inherit',
    cwd: destination,
  });

  // Read the package.json inside the backend directory (strapi)
  const packageJSON = await fs.readJSON(`${destination}/backend/package.json`);

  // Change the uuid inside the package.json
  await fs.writeJson(`${destination}/backend/package.json`, {
    ...packageJSON,
    strapi: { uuid: uuid() },
  });

  console.log(`
  \x1b[32mSuccess!\x1b[0m Cloned ${destinationName}
  Inside that directory, you can run both of your frontend and backend server:

  backend

    \x1b[36mcd ${destinationName}/backend
    strapi dev\x1b[0m
      Starts the development server.

  -------------

  frontend

    \x1b[36mcd ${destinationName}/frontend
    yarn start\x1b[0m
      Starts the development server.

  Thanks for giving this starter a try!
  `);

  if (repository === undefined) {
    console.error('Please specify the <repository> of your starter');
    process.exit(1);
  }
};
