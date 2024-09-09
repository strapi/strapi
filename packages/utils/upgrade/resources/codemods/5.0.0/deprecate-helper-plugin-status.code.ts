import type { Transform } from 'jscodeshift';
import { changeImportSpecifier } from '../../utils/change-import';

/**
 * change Status import from '@strapi/helper-plugin' to '@strapi/design-system'
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  changeImportSpecifier(root, j, {
    oldMethodName: 'Status',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/design-system',
  });

  return root.toSource();
};

export default transform;
