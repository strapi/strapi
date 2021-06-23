'use strict';

const inquirer = require('inquirer');
const fetch = require('node-fetch');
const yaml = require('js-yaml');

/**
 * @param {string|null} projectName - The name/path of project
 * @param {string|null} starterUrl - The GitHub repo of the starter
 * @returns Object containting prompt answers
 */
module.exports = async function promptUser(projectName, starter) {
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
  const content = await getStarterData();

  // Fallback to manual input when fetch fails
  if (!content) {
    return {
      type: 'input',
      message: 'Please provide the GitHub URL for the starter you would like to use:',
    };
  }

  const choices = content.map(option => {
    const name = option.title.replace('Starter', '');

    return {
      name,
      value: `https://github.com/${option.repo}`,
    };
  });

  return {
    type: 'list',
    message:
      'Which starter would you like to use? (Starters are fullstack Strapi applications designed for a specific use case)',
    pageSize: choices.length,
    choices,
  };
}

/**
 *
 * @returns JSON starter data
 */
async function getStarterData() {
  const response = await fetch(
    `https://api.github.com/repos/strapi/community-content/contents/starters/starters.yml`
  );

  if (!response.ok) {
    return null;
  }

  const { content } = await response.json();
  const buff = Buffer.from(content, 'base64');
  const stringified = buff.toString('utf-8');

  return yaml.load(stringified);
}
