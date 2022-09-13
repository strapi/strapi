'use strict';

const inquirer = require('inquirer');

/**
 * @param {string|null} projectName - The name/path of project
 * @param {string|null} template - The Github repo of the template
 * @returns Object containting prompt answers
 */
module.exports = async function promptUser(projectName, program, hasDatabaseOptions) {
  const questions = await getPromptQuestions(projectName, program, hasDatabaseOptions);
  return inquirer.prompt(questions);
};

/**
 * @param {string|null} projectName - The name of the project
 * @param {string|null} template - The template the project should use
 * @returns Array of prompt question objects
 */
async function getPromptQuestions(projectName, program, hasDatabaseOptions) {
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
      when: !program.quickstart && !hasDatabaseOptions,
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
