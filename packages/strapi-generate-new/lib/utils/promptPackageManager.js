'use strict';

const inquirer = require(`inquirer`);

module.exports = async function promptPackageManager() {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Choose your installation type',
      choices: [
        {
          name: 'yarn (recommended)',
          value: 'yarn',
        },
        {
          name: 'npm',
          value: 'npm',
        },
      ],
    },
  ]);
  return answer.type;
};
