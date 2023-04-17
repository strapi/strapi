import inquirer from 'inquirer';
import type { Program } from '../types';

interface Answers {
  directory: string;
  quick: boolean;
  starter: string;
}

// Prompts the user with required questions to create the project and return the answers
export default async function promptUser(projectName: string, starter: string, program: Program) {
  const questions: inquirer.QuestionCollection = [
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
    {
      type: 'input',
      name: 'starter',
      when: !starter,
      message: 'Please provide the npm package name of the starter you want to use:',
    },
  ];

  return inquirer.prompt<Answers>(questions);
}
