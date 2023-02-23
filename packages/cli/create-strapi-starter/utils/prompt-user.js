'use strict';

const inquirer = require('inquirer');

/**
 * @param {string|null} projectName - The name/path of project
 * @param {string|null} starterUrl - The GitHub repo of the starter
 * @returns Object containing prompt answers
 */
module.exports = async function promptUser(projectName, starter, program) {
  const mainQuestions = [
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
      when: !program.quickstart,
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

  const [mainResponse, starterQuestion] = await Promise.all([
    inquirer.prompt(mainQuestions),
    getStarterQuestion(),
  ]);

  const starterResponse = await inquirer.prompt({
    name: 'starter',
    when: !starter,
    ...starterQuestion,
  });

  return { ...mainResponse, ...starterResponse };
};

/**
 *
 * @returns Prompt question object
 */
async function getStarterQuestion() {
  // Ask user to manually input his starter
  // TODO: find way to suggest the possible v4 starters
  return {
    type: 'input',
    message: 'Please provide the npm package name of the starter you want to use:',
  };
}
