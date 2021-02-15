import { createDefaultConditionsForm } from './createDefaultCTFormFromLayout';

const createSubCategoryForm = (actions, conditions) => {
  return actions.reduce((acc, current) => {
    acc[current.action] = {
      enabled: false,
      conditions: createDefaultConditionsForm(conditions),
    };

    return acc;
  }, {});
};

const createChildrenDefaultForm = (childrenForm, conditions) => {
  return childrenForm.reduce((acc, current) => {
    acc[current.subCategoryId] = createSubCategoryForm(current.actions, conditions);

    return acc;
  }, {});
};

const createDefaultPluginsFormFromLayout = (pluginsLayout, conditions) => {
  return pluginsLayout.reduce((acc, { categoryId, childrenForm }) => {
    const childrenDefaultForm = createChildrenDefaultForm(childrenForm, conditions);
    acc[categoryId] = childrenDefaultForm;

    return acc;
  }, {});
};

export default createDefaultPluginsFormFromLayout;
export { createSubCategoryForm, createChildrenDefaultForm };
