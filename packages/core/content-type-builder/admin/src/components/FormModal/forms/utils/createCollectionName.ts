import { snakeCase } from 'lodash/fp';
import pluralize from 'pluralize';

const createComponentCollectionName = (name: string, category: string) => {
  return `components_${snakeCase(category)}_${pluralize(snakeCase(name))}`;
};

export { createComponentCollectionName };
