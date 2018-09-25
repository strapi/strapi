/**
 * Route Generator
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const routesFilePath = path.resolve(process.cwd(), 'admin', 'src', 'routes.json');

const componentExists = require('../utils/componentExists');

// Generate the update file content
const generateUpdatedFileContent = (data, existingContent) => {
  const fileContent = existingContent || {};

  // Add new route
  const updatedFileContent = fileContent;
  updatedFileContent[data.path] = {
    container: data.container,
  };

  return updatedFileContent;
};

module.exports = {
  description: 'Add a route',
  prompts: [{
    type: 'input',
    name: 'container',
    message: 'Which container should the route show?',
    validate: (value) => {
      if ((/.+/).test(value)) {
        return componentExists(value) ? true : `"${value}" doesn't exist.`;
      }

      return 'The path is required';
    },
  }, {
    type: 'input',
    name: 'path',
    message: 'Enter the path of the route.',
    default: '/about',
    validate: (value) => {
      if ((/.+/).test(value)) {
        return true;
      }

      return 'path is required';
    },
  }],

  actions: (data) => {
    const replaceFile = () => {
      // Check if the file is existing or not
      let routesFilesStats;
      try {
        routesFilesStats = fs.statSync(routesFilePath);
      } catch (error) {
        routesFilesStats = false;
      }
      const routesFilesExists = routesFilesStats && routesFilesStats.isFile();

      // Read the file content
      let existingContent = {};
      if (routesFilesExists) {
        try {
          existingContent = fs.readFileSync(routesFilePath, 'utf8');
        } catch (error) {
          existingContent = false;
          console.log('Unable to read existing `admin/src/routes.json` file content.');
        }

        try {
          existingContent = JSON.parse(existingContent);
        } catch (error) {
          existingContent = false;
          console.log('Unable to parse existing `admin/src/routes.json` file content.');
        }
      }

      // Generate updated content
      const updatedContent = generateUpdatedFileContent(data, existingContent || {});

      // Delete the file if existing
      if (routesFilesExists) {
        try {
          fs.unlinkSync(routesFilePath);
        } catch (error) {
          console.log('Unable to remove `admin/src/routes.json` file.');
          throw error;
        }
      }

      // Write the new file
      try {
        fs.writeFileSync(routesFilePath, JSON.stringify(updatedContent, null, 2), 'utf8');
        console.log('File `admin/src/routes.json` successfully written.');
      } catch (error) {
        console.log('Unable to write `admin/src/routes.json` file.');
        throw error;
      }
    };

    return [replaceFile];
  },
};
