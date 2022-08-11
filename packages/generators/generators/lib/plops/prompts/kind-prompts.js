'use strict';

const validateInput = require('../utils/validate-input');

module.exports = [
  {
    type: 'list',
    name: 'kind',
    message: 'Please choose the model type',
    default: 'collectionType',
    choices: [
      { name: 'Collection Type', value: 'collectionType' },
      { name: 'Single Type', value: 'singleType' },
    ],
    validate: (input) => validateInput(input),
  },
];
