import produce from 'immer'; // current
import set from 'lodash/set';
import get from 'lodash/get';
import { arrayMoveItem } from '../../utils';

const initialState = {
  fieldForm: {},
  fieldToEdit: '',
  initialData: {},
  modifiedData: {},
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    const layoutFieldListPath = ['modifiedData', 'layouts', 'list'];
    switch (action.type) {
      case 'ADD_FIELD': {
        const layoutFieldList = get(state, layoutFieldListPath, []);
        set(draftState, layoutFieldListPath, [...layoutFieldList, action.item]);
        break;
      }
      case 'MOVE_FIELD': {
        const layoutFieldList = get(state, layoutFieldListPath, []);
        const { originalIndex, atIndex } = action;
        set(
          draftState,
          layoutFieldListPath,
          arrayMoveItem(layoutFieldList, originalIndex, atIndex)
        );
        break;
      }
      case 'ON_CHANGE': {
        set(draftState, ['modifiedData', ...action.keys.split('.')], action.value);
        break;
      }
      case 'ON_CHANGE_FIELD_METAS': {
        set(draftState, ['fieldForm', action.name], action.value);
        break;
      }
      case 'REMOVE_FIELD': {
        const layoutFieldList = get(state, layoutFieldListPath, []);
        set(
          draftState,
          layoutFieldListPath,
          layoutFieldList.filter((_, index) => action.index !== index)
        );
        break;
      }
      case 'SET_FIELD_TO_EDIT': {
        const { fieldToEdit } = action;
        draftState.fieldToEdit = fieldToEdit;
        draftState.fieldForm.label = get(
          draftState,
          ['modifiedData', 'metadatas', fieldToEdit, 'list', 'label'],
          ''
        );
        draftState.fieldForm.sortable = get(
          draftState,
          ['modifiedData', 'metadatas', fieldToEdit, 'list', 'sortable'],
          ''
        );
        break;
      }
      case 'UNSET_FIELD_TO_EDIT': {
        draftState.fieldForm = {};
        draftState.fieldToEdit = '';
        break;
      }
      case 'SUBMIT_FIELD_FORM': {
        const fieldMetadataPath = ['modifiedData', 'metadatas', state.fieldToEdit, 'list'];
        set(draftState, [...fieldMetadataPath, 'label'], state.fieldForm.label);
        set(draftState, [...fieldMetadataPath, 'sortable'], state.fieldForm.sortable);
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
