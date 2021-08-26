'use strict';

const inquirer = require('inquirer');

const getAttributes = async (attributes = []) => {
  const prompts = [
    {
      type: 'input',
      name: 'inputValue',
      message: 'Enter some input: ',
    },
    {
      type: 'confirm',
      name: 'again',
      message: 'Enter another input? ',
      default: true,
    },
  ];

  // eslint-disable-next-line
  const { again, ...answers } = await inquirer.prompt(prompts);

  const newInputs = [...attributes, answers];
  return again ? getAttributes(newInputs) : newInputs;
};

module.exports = getAttributes;
