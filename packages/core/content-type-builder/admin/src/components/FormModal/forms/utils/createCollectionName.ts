// [ESM compat] admin frontend is bundled by Vite so this doesn't leak into Node ESM output; fix when migrating to es-toolkit
import { snakeCase } from 'lodash/fp';
import pluralize from 'pluralize';

// TODO: create a utility for this
// Duplicate in server/src/services/schema-builder/component-builder.ts
const createComponentCollectionName = (name: string, category: string) => {
  return `components_${snakeCase(category)}_${pluralize(snakeCase(name))}`;
};

export { createComponentCollectionName };
