import produce, { current } from 'immer';
import set from 'lodash/set';
import get from 'lodash/get';

const initialState = {
  labelForm: {},
  labelToEdit: '',
  initialData: {},
  modifiedData: {},
  status: 'resolved',
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

        if (
          layoutFieldList.length > 1 &&
          originalIndex <= layoutFieldList.length &&
          atIndex <= layoutFieldList.length
        ) {
          const item = layoutFieldList.splice(action.originalIndex, 1);
          layoutFieldList.splice(action.atIndex, 0, item[0]);
          set(draftState, layoutFieldListPath, layoutFieldList);
        }
        break;
      }
      case 'ON_CHANGE': {
        set(draftState, ['modifiedData', ...action.keys.split('.')], action.value);
        break;
      }
      case 'ON_CHANGE_LABEL_METAS': {
        set(draftState, ['labelForm', action.name], action.value);
        break;
      }
      case 'ON_RESET': {
        draftState.modifiedData = state.initialData;
        break;
      }
      case 'REMOVE_FIELD': {
        const layoutFieldList = get(state, layoutFieldListPath, []);
        const defaultSortPath = ['modifiedData', 'settings', 'defaultSortBy'];
        set(
          draftState,
          layoutFieldListPath,
          layoutFieldList.filter((_, index) => action.index !== index)
        );

        // TODO : Check with the team if we still need the defaultSortBy reassignment.
        const fieldToRemove = get(state, [...layoutFieldListPath, action.index], '');
        const defaultSortField = get(state, defaultSortPath, '');

        if (fieldToRemove === defaultSortField) {
          const newDefaultSortField = get(current(draftState), [...layoutFieldListPath, 0], '');
          const firstFieldType = get(
            current(draftState),
            ['modifiedData', 'attributes', newDefaultSortField, 'type'],
            ''
          );
          const fieldToSelectAsDefaultSort =
            firstFieldType !== 'media' && firstFieldType !== 'richtext'
              ? newDefaultSortField
              : 'id';
          set(draftState, defaultSortPath, fieldToSelectAsDefaultSort);
        }
        break;
      }
      case 'SET_LABEL_TO_EDIT': {
        const { labelToEdit } = action;
        draftState.labelToEdit = labelToEdit;
        draftState.labelForm.label = get(
          current(draftState),
          ['modifiedData', 'metadatas', labelToEdit, 'list', 'label'],
          ''
        );
        draftState.labelForm.sortable = get(
          current(draftState),
          ['modifiedData', 'metadatas', labelToEdit, 'list', 'sortable'],
          ''
        );
        break;
      }
      case 'UNSET_LABEL_TO_EDIT': {
        draftState.labelToEdit = '';
        draftState.labelForm = {};
        break;
      }
      case 'SUBMIT_LABEL_FORM': {
        const fieldMetadataPath = ['modifiedData', 'metadatas', state.labelToEdit, 'list'];
        set(draftState, [...fieldMetadataPath, 'label'], state.labelForm.label);
        set(draftState, [...fieldMetadataPath, 'sortable'], state.labelForm.sortable);
        break;
      }
      case 'SUBMIT_SUCCEEDED': {
        draftState.initialData = state.modifiedData;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
