import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';

import { createLayout, formatLayout } from './utils/layout';

import type { SettingsViewLayout, SettingsViewComponentLayout } from '../../utils/layouts';

const init = (
  initialState: any,
  mainLayout: SettingsViewLayout,
  components: Record<string, SettingsViewComponentLayout>
) => {
  const initialData = cloneDeep(mainLayout);

  set(initialData, ['layouts', 'edit'], formatLayout(createLayout(mainLayout.layouts.edit)));

  return {
    ...initialState,
    initialData,
    modifiedData: initialData,
    componentLayouts: components,
  };
};

export { init };
