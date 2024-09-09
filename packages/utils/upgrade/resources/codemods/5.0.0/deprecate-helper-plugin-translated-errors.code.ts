import type { Transform } from 'jscodeshift';
import { changeImportSpecifier } from '../../utils/change-import';

/**
 * change translatedErrors import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  changeImportSpecifier(root, j, {
    oldMethodName: 'translatedErrors',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  return root.toSource();
};

export default transform;
