'use strict';

const inquirer = require('inquirer');
const fetch = require('node-fetch');
const yaml = require('js-yaml');

/**
 * @param {string|null} projectName - The name/path of project
 * @param {string|null} template - The Github repo of the template
 * @returns Object containting prompt answers
 */
module.exports = async function promptUser(projectName, template) {
  const questions = await getPromptQuestions(projectName, template);
  const [initialResponse, templateQuestion] = await Promise.all([
    inquirer.prompt(questions),
    getTemplateQuestion(),
  ]);

  if (initialResponse.useTemplate) {
    const updatedResponse = await inquirer.prompt(templateQuestion);
    return { ...initialResponse, ...updatedResponse };
  }

  return initialResponse;
};

/**
 *
 * @returns Prompt question object
 */
async function getTemplateQuestion() {
  const content = await getTemplateData();
  // Fallback to manual input when fetch fails
  if (!content) {
    return {
      name: 'template',
      type: 'input',
      message: 'Please provide the GitHub URL for your template:',
    };
  }

  const choices = content.map(option => {
    const name = option.title.replace('Template', '');
    return {
      name,
      value: `https://github.com/${option.repo}`,
    };
  });

  return {
    name: 'template',
    type: 'list',
    message: `Select a template`,
    pageSize: choices.length,
    choices,
  };
}

/**
 * @param {string|null} projectName - The name of the project
 * @param {string|null} template - The template the project should use
 * @returns Array of prompt question objects
 */
// TODO: re-enabled once the template have been migrated to V4
async function getPromptQuestions(projectName, template) {
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
    {
      type: 'confirm',
      name: 'useTemplate',
      when: !template,
      message:
        'Would you like to use a template? (Templates are Strapi configurations designed for a specific use case)',
    },
  ];
}

/**
 *
 * @returns JSON template data
 */
async function getTemplateData() {
  const response = await fetch(
    `https://api.github.com/repos/strapi/community-content/contents/templates/templates.yml`
  );
  if (!response.ok) {
    return null;
  }

  const { content } = await response.json();
  const buff = Buffer.from(content, 'base64');
  const stringified = buff.toString('utf-8');

  return yaml.load(stringified);
}
