/**
 * Route Generator
 */
const fs = require('fs');
const path = require('path');

const routesFilePath = path.resolve(process.cwd(), 'admin', 'src', 'routes.json');

const componentExists = require('../utils/componentExists');

// Generate the update file content
const generateUpdatedFileContent = (data) => {
  // Check if the file is existing or not
  const routesFilesExists = fs.existsSync(routesFilePath);

  // Read file
  const fileContent = routesFilesExists ? JSON.parse(fs.readFileSync(routesFilePath, 'utf8')) : {};

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
      const routesFilesExists = fs.existsSync(routesFilePath);

      // Generate updated content
      const updatedContent = generateUpdatedFileContent(data);

      // Delete the file if existing
      if (routesFilesExists) {
        fs.unlinkSync(routesFilePath);
      }

      // Write the new file
      fs.writeFileSync(routesFilePath, JSON.stringify(updatedContent, null, 2), 'utf8');
    };

    return [replaceFile];
  },
};
