import inquirer from 'inquirer';
import type { Program } from '../types';

interface Answers {
  directory: string;
  quick: boolean;
}

export default async function promptUser(
  projectName: string,
  program: Program,
  hasDatabaseOptions: boolean
) {
  return inquirer.prompt<Answers>([
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
  ]);
}
