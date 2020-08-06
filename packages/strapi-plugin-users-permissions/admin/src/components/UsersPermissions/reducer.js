/* eslint-disable consistent-return */
import produce from 'immer';
import { set, get, mapValues } from 'lodash';

export const initialState = {
  permissions: {},
  pluginName: '',
  routes: {},
  selectedAction: '',
  policies: [],
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'SELECT_ACTION': {
        const { actionToSelect } = action;
        draftState.selectedAction = actionToSelect === state.selectedAction ? '' : actionToSelect;
        break;
      }
      case 'SET_PLUGIN_NAME': {
        draftState.pluginName = action.pluginName;
        break;
      }
      case 'SELECT_POLICY': {
        const { policyName } = action;
        const { selectedAction } = state;
        set(draftState, ['permissions', ...selectedAction.split('.'), 'policy'], policyName);
        break;
      }
      case 'SELECT_PERMISSION': {
        const { permissionToSelect } = action;
        const isSelected = get(
          state.permissions,
          [...permissionToSelect.split('.'), 'enabled'],
          false
        );
        set(draftState, ['permissions', ...permissionToSelect.split('.'), 'enabled'], !isSelected);
        break;
      }
      case 'SELECT_SUBCATEGORY': {
        const { subcategoryPath, shouldEnable } = action;
        const subCategoryValues = mapValues(
          get(state.permissions, subcategoryPath.split('.'), {}),
          e => ({
            ...e,
            enabled: shouldEnable,
          })
        );
        set(draftState, ['permissions', ...subcategoryPath.split('.')], subCategoryValues);
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
