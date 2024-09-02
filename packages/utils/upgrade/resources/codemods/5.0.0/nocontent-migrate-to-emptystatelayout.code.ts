import type { Transform } from 'jscodeshift';
import { changeImportSpecifier } from '../../utils/change-import';
import { replaceJSXElement } from '../../utils/replace-jsx';

/**
 * change NoContent import from '@strapi/helper-plugin' to EmptyStateLayout from '@strapi/design-system'
 * And replace all uses of NoContent with EmptyStateLayout
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  replaceJSXElement(root, j, {
    oldElementName: 'NoContent',
    newElementName: 'EmptyStateLayout',
    oldDependency: '@strapi/helper-plugin',
  });

  changeImportSpecifier(root, j, {
    oldMethodName: 'NoContent',
    newMethodName: 'EmptyStateLayout',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/design-system',
  });

  return root.toSource();
};

export default transform;
