import { createSelector } from '@reduxjs/toolkit';

import { createAttributesLayout, getCustomFieldUidsFromLayout } from './utils';

const selectCurrentLayout = (state) => state['content-manager_editViewLayoutManager'].currentLayout;

const selectAttributesLayout = createSelector(selectCurrentLayout, (layout) =>
  createAttributesLayout(layout?.contentType ?? {})
);

const selectCustomFieldUids = createSelector(selectCurrentLayout, (layout) =>
  getCustomFieldUidsFromLayout(layout)
);

export { selectAttributesLayout, selectCurrentLayout, selectCustomFieldUids };
