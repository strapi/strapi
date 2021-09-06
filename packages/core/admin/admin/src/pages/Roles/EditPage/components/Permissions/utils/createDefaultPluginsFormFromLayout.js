import { get } from 'lodash';
import { createDefaultConditionsForm } from './createDefaultCTFormFromLayout';
import findMatchingPermission from './findMatchingPermissions';

const createSubCategoryForm = (actions, conditions, permissions) => {
  return actions.reduce((acc, current) => {
    const foundMatchingPermission = findMatchingPermission(permissions, current.action, null);

    acc[current.action] = {
      properties: {
        enabled: foundMatchingPermission !== undefined,
      },
      conditions: createDefaultConditionsForm(
        conditions,
        get(foundMatchingPermission, 'conditions', [])
      ),
    };

    return acc;
  }, {});
};

const createChildrenDefaultForm = (childrenForm, conditions, initialPermissions) => {
  return childrenForm.reduce((acc, current) => {
    acc[current.subCategoryId] = createSubCategoryForm(
      current.actions,
      conditions,
      initialPermissions
    );

    return acc;
  }, {});
};

const createDefaultPluginsFormFromLayout = (pluginsLayout, conditions, initialPermissions = []) => {
  return pluginsLayout.reduce((acc, { categoryId, childrenForm }) => {
    const childrenDefaultForm = createChildrenDefaultForm(
      childrenForm,
      conditions,
      initialPermissions
    );
    acc[categoryId] = childrenDefaultForm;

    return acc;
  }, {});
};

export default createDefaultPluginsFormFromLayout;
export { createSubCategoryForm, createChildrenDefaultForm };
