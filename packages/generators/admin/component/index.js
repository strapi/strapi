'use strict';

const { flow, camelCase, upperFirst, lowerCase } = require('lodash');
const fileExistsInPackages = require('../utils/fileExistsInPackages');
const getPluginList = require('../utils/getPluginList');

const pascalCase = flow(camelCase, upperFirst);

const prompts = [
  {
    type: 'list',
    name: 'plugin',
    message: 'Which plugin should be targeted?',
    choices: getPluginList,
  },
  {
    type: 'input',
    name: 'name',
    message: 'What should be the name of the component?',
    validate: async (name, answers) => {
      if (!name) {
        return 'The name cannot be empty.';
      }

      return (await fileExistsInPackages(`${answers.plugin}/admin/src/components/${name}`))
        ? 'This component already exists.'
        : true;
    },
    filter: pascalCase,
  },
  {
    type: 'confirm',
    name: 'styled',
    message: 'Is this a styled component?',
  },
  {
    type: 'input',
    name: 'htmlTag',
    message: 'Which HTML tag should be used as a base?',
    when: answers => answers.styled,
    validate: htmlTag => (!htmlTag ? 'The HTML tag cannot be empty.' : true),
    filter: lowerCase,
  },
  {
    type: 'confirm',
    name: 'useI18n',
    message: 'Will it use i18n?',
    when: answers => !answers.styled,
  },
  {
    type: 'confirm',
    name: 'useRedux',
    message: 'Will it use Redux?',
    when: answers => !answers.styled,
  },
];

const actions = answers => {
  const { useRedux } = answers;
  const [pluginFolder, plugin] = answers.plugin.split('/');
  answers.plugin = plugin;
  const templateFolder = 'component/templates';
  const pattern = useRedux ? '**/**.hbs' : '**/index.*.hbs';
  return [
    {
      type: 'addMany',
      destination: `../../${pluginFolder}/{{plugin}}/admin/src/components/{{name}}`,
      templateFiles: [`${templateFolder}/${pattern}`],
      base: templateFolder,
    },
    // TODO: If redux will be used then 'append' created reducer inside 'reducers.js'
  ];
};

module.exports = { prompts, actions };
