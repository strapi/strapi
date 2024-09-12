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

  type Replacement = {
    oldName: string;
    oldDependency: string;
    toReplace: boolean;
    toChangeImportSpecifier: boolean;
    newDependency?: string;
    newName?: string;
  };

  const replacements: Replacement[] = [
    {
      oldName: 'AnErrorOccurred',
      newName: 'Page.Error',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toReplace: true,
      toChangeImportSpecifier: true,
    },
    {
      oldName: 'CheckPagePermissions',
      newName: 'Page.Protect',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toReplace: true,
      toChangeImportSpecifier: true,
    },
    {
      oldName: 'ConfirmDialog',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'DateTimePicker',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/design-system',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'getFetchClient',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'LoadingIndicatorPage',
      newName: 'Page.Loading',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toReplace: true,
      toChangeImportSpecifier: true,
    },
    {
      oldName: 'NoContent',
      newName: 'EmptyStateLayout',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/design-system',
      toReplace: true,
      toChangeImportSpecifier: true,
    },
    {
      oldName: 'NoPermissions',
      newName: 'Page.NoPermissions',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toReplace: true,
      toChangeImportSpecifier: true,
    },
    {
      oldName: 'Status',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/design-system',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'translatedErrors',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'useAPIErrorHandler',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'useCallbackRef',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/design-system',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'useCollator',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/design-system',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'useFetchClient',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'useFilter',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/design-system',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'useQueryParams',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'useRBAC',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'SearchURLQuery',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
    {
      oldName: 'useSettingsForm',
      oldDependency: '@strapi/helper-plugin',
      newDependency: '@strapi/strapi/admin',
      toChangeImportSpecifier: true,
      toReplace: false,
    },
  ];

  replacements.forEach((replacement) => {
    if (replacement.toReplace && replacement.newName) {
      replaceJSXElement(root, j, {
        oldElementName: replacement.oldName,
        newElementName: replacement.newName,
        oldDependency: replacement.oldDependency,
      });
    }

    if (replacement.toChangeImportSpecifier && replacement.newDependency) {
      changeImportSpecifier(root, j, {
        oldMethodName: replacement.oldName,
        newMethodName: replacement.newName,
        oldDependency: replacement.oldDependency,
        newDependency: replacement.newDependency,
      });
    }
  });

  return root.toSource();
};

export default transform;
