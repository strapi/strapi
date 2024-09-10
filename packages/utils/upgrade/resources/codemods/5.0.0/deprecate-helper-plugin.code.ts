import type { Transform } from 'jscodeshift';
import { changeImportSpecifier } from '../../utils/change-import';
import { replaceJSXElement } from '../../utils/replace-jsx';

/**
 * This codemods automates all the imports and naming changes
 * for methods or components that used to be imported from '@strapi/helper-plugin'
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  /**
   * change AnErrorOccurred import from '@strapi/helper-plugin' to Page from '@strapi/strapi/admin'
   * And replace all uses of AnErrorOccurred with Page.Error
   */

  replaceJSXElement(root, j, {
    oldElementName: 'AnErrorOccurred',
    newElementName: 'Page.Error',
    oldDependency: '@strapi/helper-plugin',
  });

  changeImportSpecifier(root, j, {
    oldMethodName: 'AnErrorOccurred',
    newMethodName: 'Page',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change CheckPagePermissions import from '@strapi/helper-plugin' to Page from '@strapi/strapi/admin'
   * And replace all uses of CheckPagePermissions with Page.Protect
   */

  replaceJSXElement(root, j, {
    oldElementName: 'CheckPagePermissions',
    newElementName: 'Page.Protect',
    oldDependency: '@strapi/helper-plugin',
  });

  changeImportSpecifier(root, j, {
    oldMethodName: 'CheckPagePermissions',
    newMethodName: 'Page',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change ConfirmDialog import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'ConfirmDialog',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change DateTimePicker import from '@strapi/helper-plugin' to '@strapi/design-system'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'DateTimePicker',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/design-system',
  });

  /**
   * change getFetchClient import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'getFetchClient',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change LoadingIndicatorPage import from '@strapi/helper-plugin' to Page from '@strapi/strapi/admin'
   * And replace all uses of LoadingIndicatorPage with Page.Loading
   */

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

  /**
   * change NoContent import from '@strapi/helper-plugin' to EmptyStateLayout from '@strapi/design-system'
   * And replace all uses of NoContent with EmptyStateLayout
   */

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

  /**
   * change NoPermissions import from '@strapi/helper-plugin' to Page from '@strapi/strapi/admin'
   * And replace all uses of NoPermissions with Page.NoPermissions
   */

  replaceJSXElement(root, j, {
    oldElementName: 'NoPermissions',
    newElementName: 'Page.NoPermissions',
    oldDependency: '@strapi/helper-plugin',
  });

  changeImportSpecifier(root, j, {
    oldMethodName: 'NoPermissions',
    newMethodName: 'Page',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change Status import from '@strapi/helper-plugin' to '@strapi/design-system'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'Status',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/design-system',
  });

  /**
   * change translatedErrors import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
   */
  changeImportSpecifier(root, j, {
    oldMethodName: 'translatedErrors',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change useAPIErrorHandler import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'useAPIErrorHandler',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change useCallbackRef import from '@strapi/helper-plugin' to '@strapi/design-system'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'useCallbackRef',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/design-system',
  });

  /**
   * change useCollator import from '@strapi/helper-plugin' to '@strapi/design-system'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'useCollator',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/design-system',
  });

  /**
   * change useFetchClient import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'useFetchClient',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change useFilter import from '@strapi/helper-plugin' to '@strapi/design-system'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'useFilter',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/design-system',
  });

  /**
   * change useQueryParams import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'useQueryParams',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change useRBAC import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'useRBAC',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  /**
   * change SearchURLQuery import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
   */

  changeImportSpecifier(root, j, {
    oldMethodName: 'SearchURLQuery',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  return root.toSource();
};

export default transform;
