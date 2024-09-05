import type { Transform } from 'jscodeshift';
import { changeImportSpecifier } from '../../utils/change-import';
import { replaceJSXElement } from '../../utils/replace-jsx';

/**
 * change CheckPagePermissions import from '@strapi/helper-plugin' to Page from '@strapi/strapi/admin'
 * And replace all uses of CheckPagePermissions with Page
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  replaceJSXElement(root, j, {
    oldElementName: 'CheckPagePermissions',
    newElementName: 'Page',
    oldDependency: '@strapi/helper-plugin',
  });

  changeImportSpecifier(root, j, {
    oldMethodName: 'CheckPagePermissions',
    newMethodName: 'Page',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  return root.toSource();
};

export default transform;
