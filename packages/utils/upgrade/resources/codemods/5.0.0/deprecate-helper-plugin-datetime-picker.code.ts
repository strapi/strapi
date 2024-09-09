import type { Transform } from 'jscodeshift';
import { changeImportSpecifier } from '../../utils/change-import';

/**
 * change DateTimePicker import from '@strapi/helper-plugin' to '@strapi/design-system'
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  changeImportSpecifier(root, j, {
    oldMethodName: 'DateTimePicker',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/design-system',
  });

  return root.toSource();
};

export default transform;
