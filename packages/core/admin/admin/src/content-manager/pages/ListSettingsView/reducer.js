import produce from 'immer'; // current
import set from 'lodash/set';
import get from 'lodash/get';
// import { arrayMoveItem } from '../../utils';

const initialState = {
  // labelForm: {},
  // labelToEdit: '',
  initialData: {},
  modifiedData: {},
  // status: 'resolved',
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    const layoutFieldListPath = ['modifiedData', 'layouts', 'list'];
    switch (action.type) {
      case 'ADD_FIELD': {
        const layoutFieldList = get(state, layoutFieldListPath, []);
        set(draftState, layoutFieldListPath, [action.item, ...layoutFieldList]);
        break;
      }
      // case 'MOVE_FIELD': {
      //   const layoutFieldList = get(state, layoutFieldListPath, []);
      //   const { originalIndex, atIndex } = action;
      //   set(
      //     draftState,
      //     layoutFieldListPath,
      //     arrayMoveItem(layoutFieldList, originalIndex, atIndex)
      //   );
      //   break;
      // }
      case 'ON_CHANGE': {
        set(draftState, ['modifiedData', ...action.keys.split('.')], action.value);
        break;
      }
      // case 'ON_CHANGE_LABEL_METAS': {
      //   set(draftState, ['labelForm', action.name], action.value);
      //   break;
      // }
      // case 'ON_RESET': {
      //   draftState.modifiedData = state.initialData;
      //   break;
      // }
      case 'REMOVE_FIELD': {
        const layoutFieldList = get(state, layoutFieldListPath, []);
        set(
          draftState,
          layoutFieldListPath,
          layoutFieldList.filter((_, index) => action.index !== index)
        );
        break;
      }
      // case 'SET_LABEL_TO_EDIT': {
      //   const { labelToEdit } = action;
      //   draftState.labelToEdit = labelToEdit;
      //   draftState.labelForm.label = get(
      //     current(draftState),
      //     ['modifiedData', 'metadatas', labelToEdit, 'list', 'label'],
      //     ''
      //   );
      //   draftState.labelForm.sortable = get(
      //     current(draftState),
      //     ['modifiedData', 'metadatas', labelToEdit, 'list', 'sortable'],
      //     ''
      //   );
      //   break;
      // }
      // case 'UNSET_LABEL_TO_EDIT': {
      //   draftState.labelToEdit = '';
      //   draftState.labelForm = {};
      //   break;
      // }
      // case 'SUBMIT_LABEL_FORM': {
      //   const fieldMetadataPath = ['modifiedData', 'metadatas', state.labelToEdit, 'list'];
      //   set(draftState, [...fieldMetadataPath, 'label'], state.labelForm.label);
      //   set(draftState, [...fieldMetadataPath, 'sortable'], state.labelForm.sortable);
      //   break;
      // }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
