import { NodePlopAPI } from 'plop';
import tsUtils from '@strapi/typescript-utils';

import getDestinationPrompts from './prompts/get-destination-prompts';
import validateInput from './utils/validate-input';
import getFilePath from './utils/get-file-path';

export default (plop: NodePlopAPI) => {
  // Policy generator
  plop.setGenerator('policy', {
    description: 'Generate a policy for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Policy name',
        validate: (input) => validateInput(input),
      },
      ...getDestinationPrompts('policy', plop.getDestBasePath(), { rootFolder: true }),
    ],
    actions(answers) {
      if (!answers) {
        return [];
      }

      const filePath = getFilePath(answers.destination);
      const currentDir = process.cwd();
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';

      return [
        {
          type: 'add',
          path: `${filePath}/policies/{{ id }}.${language}`,
          templateFile: `templates/${language}/policy.${language}.hbs`,
        },
      ];
    },
  });
};
