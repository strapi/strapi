import validateInput from '../utils/validate-input';

const questions = [
  {
    type: 'list',
    name: 'kind',
    message: 'Please choose the model type',
    default: 'collectionType',
    choices: [
      { name: 'Collection Type', value: 'collectionType' },
      { name: 'Single Type', value: 'singleType' },
    ],
    validate: (input: string) => validateInput(input),
  },
];

export default questions;
