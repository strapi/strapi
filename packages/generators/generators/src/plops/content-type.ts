import { join } from 'path';
import type { NodePlopAPI, ActionType } from 'plop';
import slugify from '@sindresorhus/slugify';
import fs from 'fs-extra';
import { strings } from '@strapi/utils';
import tsUtils from '@strapi/typescript-utils';

import getDestinationPrompts from './prompts/get-destination-prompts';
import getFilePath from './utils/get-file-path';
import ctNamesPrompts from './prompts/ct-names-prompts';
import kindPrompts from './prompts/kind-prompts';
import getAttributesPrompts from './prompts/get-attributes-prompts';
import bootstrapApiPrompts from './prompts/bootstrap-api-prompts';
import { appendToFile } from './utils/extend-plugin-index-files';

export default (plop: NodePlopAPI) => {
  // Model generator
  plop.setGenerator('content-type', {
    description: 'Generate a content type for an API',
    async prompts(inquirer) {
      const config = await inquirer.prompt([...ctNamesPrompts, ...kindPrompts]);
      const attributes = await getAttributesPrompts(inquirer);

      const api = await inquirer.prompt([
        ...getDestinationPrompts('model', plop.getDestBasePath()),
        {
          when: (answers) => answers.destination === 'new',
          type: 'input',
          name: 'id',
          default: config.singularName,
          message: 'Name of the new API?',
          async validate(input) {
            if (!strings.isKebabCase(input)) {
              return 'Value must be in kebab-case';
            }

            const apiPath = join(plop.getDestBasePath(), 'api');
            const exists = await fs.pathExists(apiPath);

            if (!exists) {
              return true;
            }

            const apiDir = await fs.readdir(apiPath, { withFileTypes: true });
            const apiDirContent = apiDir.filter((fd) => fd.isDirectory());

            if (apiDirContent.findIndex((dir) => dir.name === input) !== -1) {
              throw new Error('This name is already taken.');
            }

            return true;
          },
        },
        ...bootstrapApiPrompts,
      ]);

      return {
        ...config,
        ...api,
        attributes,
      };
    },
    actions(answers) {
      if (!answers) {
        return [];
      }

      const attributes = answers.attributes.reduce((object: any, answer: any) => {
        const val: any = { type: answer.attributeType };

        if (answer.attributeType === 'enumeration') {
          val.enum = answer.enum.split(',').map((item: string) => item.trim());
        }

        if (answer.attributeType === 'media') {
          val.allowedTypes = ['images', 'files', 'videos', 'audios'];
          val.multiple = answer.multiple;
        }

        return Object.assign(object, { [answer.attributeName]: val }, {});
      }, {});

      const filePath = getFilePath(answers.destination);
      const currentDir = process.cwd();
      let language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';

      if (answers.plugin) {
        // The tsconfig in plugins is located just outside the server src, not in the root of the plugin.
        const pluginServerDir = join(
          currentDir,
          'src',
          filePath.replace('{{ plugin }}', answers.plugin),
          '../'
        );
        language = tsUtils.isUsingTypeScriptSync(pluginServerDir) ? 'ts' : 'js';
      }

      const baseActions: Array<ActionType> = [
        {
          type: 'add',
          path: `${filePath}/content-types/{{ singularName }}/schema.json`,
          templateFile: `templates/${language}/content-type.schema.json.hbs`,
          data: {
            collectionName: slugify(answers.pluralName, { separator: '_' }),
          },
        },
      ];

      if (Object.entries(attributes).length > 0) {
        baseActions.push({
          type: 'modify',
          path: `${filePath}/content-types/{{ singularName }}/schema.json`,
          transform(template: string) {
            const parsedTemplate = JSON.parse(template);
            parsedTemplate.attributes = attributes;
            return JSON.stringify(parsedTemplate, null, 2);
          },
        });
      }

      if (answers.plugin) {
        const indexPath = join(
          plop.getDestBasePath(),
          `${filePath}/content-types/index.${language}`
        );
        const exists = fs.existsSync(indexPath);

        if (!exists) {
          // Create index file if it doesn't exist
          baseActions.push({
            type: 'add',
            path: `${filePath}/content-types/index.${language}`,
            templateFile: `templates/${language}/plugin/plugin.index.${language}.hbs`,
            skipIfExists: true,
          });
        }

        // Append the new content type to the index.ts file
        baseActions.push({
          type: 'modify',
          path: `${filePath}/content-types/index.${language}`,
          transform(template: string) {
            return appendToFile(template, {
              type: 'content-type',
              singularName: answers.singularName,
            });
          },
        });
      }

      if (answers.bootstrapApi) {
        const { singularName } = answers;

        let uid;
        if (answers.destination === 'new') {
          uid = `api::${answers.id}.${singularName}`;
        } else if (answers.api) {
          uid = `api::${answers.api}.${singularName}`;
        } else if (answers.plugin) {
          uid = `plugin::${answers.plugin}.${singularName}`;
        }

        baseActions.push(
          {
            type: 'add',
            path: `${filePath}/controllers/{{ singularName }}.${language}`,
            templateFile: `templates/${language}/core-controller.${language}.hbs`,
            data: { uid },
          },
          {
            type: 'add',
            path: `${filePath}/services/{{ singularName }}.${language}`,
            templateFile: `templates/${language}/core-service.${language}.hbs`,
            data: { uid },
          },
          {
            type: 'add',
            path: `${filePath}/routes/${answers.plugin ? 'content-api/' : ''}{{ singularName }}.${language}`,
            templateFile: `templates/${language}/core-router.${language}.hbs`,
            data: { uid },
          }
        );

        if (answers.plugin) {
          const indexFiles = ['controllers', 'services', 'routes'];

          indexFiles.forEach((type) => {
            const indexPath = join(plop.getDestBasePath(), `${filePath}/${type}/index.${language}`);
            const exists = fs.existsSync(indexPath);

            if (!exists && type !== 'routes') {
              baseActions.push({
                type: 'add',
                path: `${filePath}/${type}/index.${language}`,
                templateFile: `templates/${language}/plugin/plugin.index.${language}.hbs`,
                skipIfExists: true,
              });
            }

            if (type === 'routes') {
              const indexPath = join(
                plop.getDestBasePath(),
                `${filePath}/${type}/index.${language}`
              );
              const exists = fs.existsSync(indexPath);

              if (!exists) {
                baseActions.push({
                  type: 'add',
                  path: `${filePath}/${type}/index.${language}`,
                  templateFile: `templates/${language}/plugin/plugin.routes.index.${language}.hbs`,
                  skipIfExists: true,
                });
              }

              const routeIndexFiles = ['content-api', 'admin'];

              routeIndexFiles.forEach((routeType) => {
                const routeTypeIndexPath = join(
                  plop.getDestBasePath(),
                  `${filePath}/${type}/${routeType}/index.${language}`
                );
                const routeTypeExists = fs.existsSync(routeTypeIndexPath);

                if (!routeTypeExists) {
                  baseActions.push({
                    type: 'add',
                    path: `${filePath}/${type}/${routeType}/index.${language}`,
                    templateFile: `templates/${language}/plugin/plugin.routes.type.index.${language}.hbs`,
                    data: { type: routeType },
                    skipIfExists: true,
                  });
                }
              });
            }

            baseActions.push({
              type: 'modify',
              path: `${filePath}/${type}/${type === 'routes' ? 'content-api/' : ''}index.${language}`,
              transform(template: string) {
                if (type === 'routes') {
                  return appendToFile(template, {
                    type: 'routes',
                    singularName: answers.singularName,
                  });
                }

                return appendToFile(template, {
                  type: 'index',
                  singularName: answers.singularName,
                });
              },
            });
          });
        }
      }

      return baseActions;
    },
  });
};
