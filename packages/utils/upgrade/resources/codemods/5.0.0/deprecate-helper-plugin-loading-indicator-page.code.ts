import type { Transform } from 'jscodeshift';
import { changeImportSpecifier } from '../../utils/change-import';
import { replaceJSXElement } from '../../utils/replace-jsx';

/**
 * change LoadingIndicatorPage import from '@strapi/helper-plugin' to Page from '@strapi/strapi/admin'
 * And replace all uses of LoadingIndicatorPage with Page.Loading
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  replaceJSXElement(root, j, {
    oldElementName: 'LoadingIndicatorPage',
    newElementName: 'Page.Loading',
    oldDependency: '@strapi/helper-plugin',
  });

  changeImportSpecifier(root, j, {
    oldMethodName: 'LoadingIndicatorPage',
    newMethodName: 'Page',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  return root.toSource();
};

export default transform;
