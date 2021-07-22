import { cloneDeep, set } from 'lodash';
import { createLayout, formatLayout } from './utils/layout';

const init = (initialState, mainLayout, components) => {
  let initialData = cloneDeep(mainLayout);

  set(initialData, ['layouts', 'edit'], formatLayout(createLayout(mainLayout.layouts.edit)));

  return {
    ...initialState,
    initialData,
    modifiedData: initialData,
    componentLayouts: components,
  };
};

export default init;
