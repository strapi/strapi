import type { Transform } from 'jscodeshift';
import { changeImportSpecifier } from '../../utils/change-import';

/**
 * change useFilter import from '@strapi/helper-plugin' to '@strapi/design-system'
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  changeImportSpecifier(root, j, {
    oldMethodName: 'useFilter',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/design-system',
  });

  return root.toSource();
};

export default transform;
