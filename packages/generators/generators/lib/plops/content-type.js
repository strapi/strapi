'use strict';

const slugify = require('@sindresorhus/slugify');

const getDestinationPrompts = require('./utils/get-destination-prompts');
const getFilePath = require('./utils/get-file-path');
const getCtNamesPrompts = require('./utils/get-ct-names-prompts');
const getKindPrompts = require('./utils/get-kind-prompts');
const getDraftAndPublishPrompts = require('./utils/get-draft-and-publish-prompts');
const getAttributesPrompts = require('./utils/get-attributes-prompts');

module.exports = plop => {
  // Model generator
  plop.setGenerator('content-type', {
    description: 'Generate a content type for an API',
    async prompts(inquirer) {
      const config = await inquirer.prompt([
        ...getCtNamesPrompts,
        ...getKindPrompts,
        ...getDestinationPrompts('model', plop.getDestBasePath()),
        ...getDraftAndPublishPrompts,
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

      return [
        {
          type: 'add',
          path: `${filePath}/content-types/{{ singularName }}/schema.json`,
          templateFile: 'templates/content-type.schema.json.hbs',
          data: {
            id: answers.singularName,
            collectionName: slugify(answers.pluralName, { separator: '_' }),
          },
        },
        {
          type: 'modify',
          path: `${filePath}/content-types/{{ singularName }}/schema.json`,
          transform(template) {
            const parsedTemplate = JSON.parse(template);
            parsedTemplate.attributes = attributes;
            return JSON.stringify(parsedTemplate, null, 2);
          },
        },
      ];
    },
  });
};
