import pluralize from 'pluralize';
import slugify from '@sindresorhus/slugify';
import { strings } from '@strapi/utils';

interface Answers {
  displayName: string;
  singularName: string;
  pluralName: string;
}

const questions = [
  {
    type: 'input',
    name: 'displayName',
    message: 'Content type display name',
    validate: (input: string) => !!input,
  },
  {
    type: 'input',
    name: 'singularName',
    message: 'Content type singular name',
    default: (answers: Answers) => slugify(answers.displayName),
    validate(input: string) {
      if (!strings.isKebabCase(input)) {
        return 'Value must be in kebab-case';
      }

      return true;
    },
  },
  {
    type: 'input',
    name: 'pluralName',
    message: 'Content type plural name',
    default: (answers: Answers) => pluralize(answers.singularName),
    validate(input: string, answers: Answers) {
      if (answers.singularName === input) {
        return 'Singular and plural names cannot be the same';
      }

      if (!strings.isKebabCase(input)) {
        return 'Value must be in kebab-case';
      }

      return true;
    },
  },
];

export default questions;
