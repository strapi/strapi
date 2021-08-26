'use strict';
const { join } = require('path');
const fs = require('fs-extra');

module.exports = (action, rootDir) => {
  return [
    {
      type: 'list',
      name: 'destination',
      message: `Where do you want to add this ${action}?`,
      choices: [
        {
          name: `Add ${action} to ${action === 'policy' ? 'root of project' : 'new API'}`,
          value: 'new',
        },
        { name: `Add ${action} to existing API`, value: 'api' },
        { name: `Add ${action} to existing plugin`, value: 'plugin' },
      ],
    },
    {
      when: answers => answers.destination === 'api',
      type: 'input',
      message: 'Which API is this for?',
      name: 'api',
      validate: async input => {
        const exists = await fs.pathExists(join(rootDir, `api/${input}`));

        return exists || 'That api does not exist, please try again';
      },
    },
    {
      when: answers => answers.destination === 'plugin',
      type: 'input',
      message: 'Which plugin is this for?',
      name: 'plugin',
      validate: async input => {
        const exists = await fs.pathExists(join(rootDir, `plugins/${input}`));

        return exists || 'That plugin does not exist, please try again';
      },
    },
  ];
};
