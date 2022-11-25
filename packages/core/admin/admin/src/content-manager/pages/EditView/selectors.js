import { createSelector } from 'reselect';
import { createAttributesLayout } from './utils';

const selectCurrentLayout = (state) => state['content-manager_editViewLayoutManager'].currentLayout;

const selectAttributesLayout = createSelector(selectCurrentLayout, (layout) =>
  createAttributesLayout(layout?.contentType ?? {})
);

export { selectCurrentLayout, selectAttributesLayout };
