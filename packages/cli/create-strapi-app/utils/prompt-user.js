'use strict';

const inquirer = require('inquirer');

/**
 * @param {string|null} projectName - The name/path of project
 * @param {object} options - Parsed CLI options
 * @param {boolean} hasDatabaseOptions - Whether database options has been passed via CLI options
 * @returns Object containting prompt answers
 */
module.exports = async function promptUser(projectName, options, hasDatabaseOptions) {
  const questions = await getPromptQuestions(projectName, options, hasDatabaseOptions);
  return inquirer.prompt(questions);
};

/**
 * @param {string|null} projectName - The name of the project
 * @param {object} options - Prased CLI options
 * @param {boolean} hasDatabaseOptions - Whether database options has been passed via CLI options
 * @returns Array of prompt question objects
 */
async function getPromptQuestions(projectName, options, hasDatabaseOptions) {
  return [
    {
      type: 'input',
      default: 'my-strapi-project',
      name: 'directory',
      message: 'What would you like to name your project?',
      when: !projectName,
    },
    {
      type: 'list',
      name: 'quick',
      message: 'Choose your installation type',
      when: !options.quickstart && !hasDatabaseOptions,
      choices: [
        {
          name: 'Quickstart (recommended)',
          value: true,
        },
        {
          name: 'Custom (manual settings)',
          value: false,
        },
      ],
    },
  ];
}
