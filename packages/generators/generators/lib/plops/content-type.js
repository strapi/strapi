'use strict';

const slugify = require('@sindresorhus/slugify');

const getDestinationPrompts = require('./prompts/get-destination-prompts');
const getFilePath = require('./utils/get-file-path');
const ctNamesPrompts = require('./prompts/ct-names-prompts');
const kindPrompts = require('./prompts/kind-prompts');
const draftAndPublishPrompts = require('./prompts/draft-and-publish-prompts');
const getAttributesPrompts = require('./prompts/get-attributes-prompts');
const bootstrapApiPrompts = require('./prompts/bootstrap-api-prompts');

module.exports = plop => {
  // Model generator
  plop.setGenerator('content-type', {
    description: 'Generate a content type for an API',
    async prompts(inquirer) {
      const config = await inquirer.prompt([
        ...ctNamesPrompts,
        ...kindPrompts,
        ...getDestinationPrompts('model', plop.getDestBasePath()),
        ...draftAndPublishPrompts,
        ...bootstrapApiPrompts,
      ]);
      const attributes = await getAttributesPrompts(inquirer);

      return {
        ...config,
        attributes,
      };
    },
    actions(answers) {
      const attributes = answers.attributes.reduce((object, answer) => {
        const val = { type: answer.attributeType };

        if (answer.attributeType === 'enumeration') {
          val.enum = answer.enum.split(',').map(item => item.trim());
        }

        if (answer.attributeType === 'media') {
          val.allowedTypes = ['images', 'files', 'videos'];
          val.multiple = answer.multiple;
        }

        return Object.assign(object, { [answer.attributeName]: val }, {});
      }, {});

      const filePath = getFilePath(answers.destination);

      answers.id = answers.singularName;

      const baseActions = [
        {
          type: 'add',
          path: `${filePath}/content-types/{{ singularName }}/schema.json`,
          templateFile: 'templates/content-type.schema.json.hbs',
          data: {
            collectionName: slugify(answers.pluralName, { separator: '_' }),
          },
        },
      ];

      if (attributes.lenght > 0) {
        baseActions.push({
          type: 'modify',
          path: `${filePath}/content-types/{{ singularName }}/schema.json`,
          transform(template) {
            const parsedTemplate = JSON.parse(template);
            parsedTemplate.attributes = attributes;
            return JSON.stringify(parsedTemplate, null, 2);
          },
        });
      }

      if (answers.bootstrapApi) {
        baseActions.push(
          {
            type: 'add',
            path: `${filePath}/controllers/{{singularName}}.js`,
            templateFile: 'templates/controller.js.hbs',
          },
          {
            type: 'add',
            path: `${filePath}/services/{{singularName}}.js`,
            templateFile: 'templates/service.js.hbs',
          },
          {
            type: 'add',
            path: `${filePath}/routes/{{singularName}}.js`,
            templateFile: `templates/${slugify(answers.kind)}-routes.js.hbs`,
          }
        );
      }

      return baseActions;
    },
  });
};
