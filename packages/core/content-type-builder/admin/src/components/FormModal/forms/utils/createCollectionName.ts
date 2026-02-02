import { snakeCase } from 'lodash/fp';
import pluralize from 'pluralize';

// TODO: create a utility for this
// Duplicate in server/src/services/schema-builder/component-builder.ts
const createComponentCollectionName = (name: string, category: string) => {
  return `components_${snakeCase(category)}_${pluralize(snakeCase(name))}`;
};

export { createComponentCollectionName };
