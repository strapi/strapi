import { createSelector } from 'reselect';
import pluginId from '../pluginId';

/**
 * Direct selector to the menuEditor state domain
 */
const selectMenuEditorDomain = () => state =>
  state.get(`${pluginId}_menuEditor`);

/**
 * Default selector used by MenuEditor
 */
const selectMenuEditor = () =>
  createSelector(
    selectMenuEditorDomain(),
    substate => substate.toJS()
  );

const SelectMenuItemsData = () =>
  createSelector(
    selectMenuEditorDomain(),
    substate => substate.get('menuItems')
  );

const SelectModifiedMenuItemsData = () =>
  createSelector(
    selectMenuEditorDomain(),
    substate => substate.get('modifiedMenuItems')
  );

export default selectMenuEditor;
export { SelectMenuItemsData, SelectModifiedMenuItemsData };
