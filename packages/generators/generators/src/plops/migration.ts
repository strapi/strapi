import type { NodePlopAPI } from 'plop';
import tsUtils from '@strapi/typescript-utils';
import validateFileNameInput from './utils/validate-file-name-input';
import getFormattedDate from './utils/get-formatted-date';

export default (plop: NodePlopAPI) => {
  plop.setGenerator('migration', {
    description: 'Generate a migration',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Migration name',
        validate: (input) => validateFileNameInput(input),
      },
      {
        type: 'list',
        name: 'phase',
        message: 'Migration phase',
        choices: [
          {
            name: 'Pre-sync — before schema sync (DDL)',
            value: 'pre-sync',
          },
          {
            name: 'Post-sync — after schema sync (data backfill)',
            value: 'post-sync',
          },
        ],
        default: 'pre-sync',
      },
    ],
    actions(answers) {
      const currentDir = process.cwd();
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';
      const timestamp = getFormattedDate();
      const isPostSync = answers?.phase === 'post-sync';
      const migrationsDir = isPostSync ? 'migrations-post' : 'migrations';
      const templateName = isPostSync ? 'post-sync-migration' : 'migration';

      return [
        {
          type: 'add',
          path: `${currentDir}/database/${migrationsDir}/${timestamp}.{{ name }}.${language}`,
          templateFile: `templates/${language}/${templateName}.${language}.hbs`,
        },
      ];
    },
  });
};
