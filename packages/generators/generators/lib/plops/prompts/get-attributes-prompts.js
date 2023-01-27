'use strict';

const validateAttributeInput = require('../utils/validate-attribute-input');

const DEFAULT_TYPES = [
  // advanced types
  'media',

  // scalar types
  'string',
  'text',
  'richtext',
  'json',
  'enumeration',
  'password',
  'email',
  'integer',
  'biginteger',
  'float',
  'decimal',
  'date',
  'time',
  'datetime',
  'timestamp',
  'boolean',
];

/**
 * @param {import('inquirer').Inquirer} inquirer
 * @returns {Promise<Record<string, string>[]>}
 */
module.exports = async (inquirer) => {
  const { addAttributes } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addAttributes',
      message: 'Do you want to add attributes?',
    },
  ]);

  const attributes = [];

  /**
   * @param {import('inquirer').Inquirer} inquirer
   * @returns {Promise<void>}
   */
  const createNewAttributes = async (inquirer) => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'attributeName',
        message: 'Name of attribute',
        validate: (input) => validateAttributeInput(input),
      },
      {
        type: 'list',
        name: 'attributeType',
        message: 'What type of attribute',
        pageSize: DEFAULT_TYPES.length,
        choices: DEFAULT_TYPES.map((type) => {
          return { name: type, value: type };
        }),
      },
      {
        when: (answers) => answers.attributeType === 'enumeration',
        type: 'input',
        name: 'enum',
        message: 'Add values separated by a comma',
      },
      {
        when: (answers) => answers.attributeType === 'media',
        type: 'list',
        name: 'multiple',
        message: 'Choose media type',
        choices: [
          { name: 'Multiple', value: true },
          { name: 'Single', value: false },
        ],
      },
      {
        type: 'confirm',
        name: 'addAttributes',
        message: 'Do you want to add another attribute?',
      },
    ]);

    attributes.push(answers);

    if (!answers.addAttributes) {
      return;
    }

    await createNewAttributes(inquirer);
  };

  if (addAttributes) {
    await createNewAttributes(inquirer);
  } else {
    console.warn(
      `You won't be able to manage entries from the admin, you can still add attributes later from the content type builder.`
    );
  }

  return attributes;
};
