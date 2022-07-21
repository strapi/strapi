import produce from 'immer';
import set from 'lodash/set';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';

import { arrayMoveItem } from '../../utils';
import { formatLayout, getDefaultInputSize, getFieldSize, setFieldSize } from './utils/layout';

const initialState = {
  fieldForm: {},
  componentLayouts: {},
  metaToEdit: '',
  initialData: {},
  metaForm: {},
  modifiedData: {},
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    const layoutPathEdit = ['modifiedData', 'layouts', 'edit'];

    switch (action.type) {
      case 'MOVE_ROW': {
        const editFieldLayoutValue = get(state, layoutPathEdit, []);
        const { fromIndex, toIndex } = action;
        set(draftState, layoutPathEdit, arrayMoveItem(editFieldLayoutValue, fromIndex, toIndex));
        break;
      }
      case 'ON_ADD_FIELD': {
        const newState = cloneDeep(state);
        const size = getDefaultInputSize(
          get(newState, ['modifiedData', 'attributes', action.name, 'type'], '')
        );
        const listSize = get(newState, layoutPathEdit, []).length;
        const actualRowContentPath = [...layoutPathEdit, listSize - 1, 'rowContent'];
        const rowContentToSet = get(newState, actualRowContentPath, []);
        let newList = get(newState, layoutPathEdit, []);

        if (Array.isArray(rowContentToSet)) {
          set(
            newList,
            [listSize > 0 ? listSize - 1 : 0, 'rowContent'],
            [...rowContentToSet, { name: action.name, size }]
          );
        } else {
          set(
            newList,
            [listSize > 0 ? listSize - 1 : 0, 'rowContent'],
            [{ name: action.name, size }]
          );
        }

        const formattedList = formatLayout(newList);
        set(draftState, layoutPathEdit, formattedList);
        break;
      }
      case 'ON_CHANGE': {
        set(draftState, ['modifiedData', ...action.keys], action.value);
        break;
      }
      case 'ON_CHANGE_META': {
        set(draftState, ['metaForm', 'metadata', ...action.keys], action.value);
        break;
      }
      case 'ON_CHANGE_SIZE': {
        set(draftState, ['metaForm', 'size'], action.value);
        break;
      }
      case 'ON_RESET': {
        draftState.modifiedData = state.initialData;
        break;
      }
      case 'REMOVE_FIELD': {
        const row = get(state, [...layoutPathEdit, action.rowIndex, 'rowContent'], []);
        let newState = cloneDeep(state);

        if (row.length === 1 || (row.length === 2 && get(row, [1, 'name'], '') === '_TEMP_')) {
          const currentRowFieldList = get(state, layoutPathEdit, []);
          set(
            newState,
            layoutPathEdit,
            currentRowFieldList.filter((_, index) => action.rowIndex !== index)
          );
        } else {
          set(
            newState,
            [...layoutPathEdit, action.rowIndex, 'rowContent'],
            row.filter((_, index) => index !== action.fieldIndex)
          );
        }
        const updatedList = formatLayout(get(newState, layoutPathEdit, []));
        set(draftState, layoutPathEdit, updatedList);
        break;
      }
      case 'REORDER_DIFF_ROW': {
        const actualRowContent = get(
          state,
          [...layoutPathEdit, action.dragRowIndex, 'rowContent'],
          []
        );
        const targetRowContent = get(
          state,
          [...layoutPathEdit, action.hoverRowIndex, 'rowContent'],
          []
        );
        const itemToInsert = get(
          state,
          [...layoutPathEdit, action.dragRowIndex, 'rowContent', action.dragIndex],
          {}
        );
        const rowContent = [...targetRowContent, itemToInsert];
        let newState = cloneDeep(state);

        set(
          newState,
          [...layoutPathEdit, action.dragRowIndex, 'rowContent'],
          actualRowContent.filter((_, index) => action.dragIndex !== index)
        );
        set(
          newState,
          [...layoutPathEdit, action.hoverRowIndex, 'rowContent'],
          arrayMoveItem(rowContent, rowContent.length - 1, action.hoverIndex)
        );

        const updatedList = formatLayout(get(newState, layoutPathEdit, []));
        set(draftState, layoutPathEdit, updatedList);
        break;
      }
      case 'REORDER_ROW': {
        const newState = cloneDeep(state);
        const rowContent = get(
          newState,
          [...layoutPathEdit, action.dragRowIndex, 'rowContent'],
          []
        );

        set(
          newState,
          [...layoutPathEdit, action.dragRowIndex, 'rowContent'],
          arrayMoveItem(rowContent, action.dragIndex, action.hoverIndex)
        );

        const updatedList = formatLayout(get(newState, layoutPathEdit, []));
        set(draftState, layoutPathEdit, updatedList);
        break;
      }
      case 'SET_FIELD_TO_EDIT': {
        draftState.metaToEdit = action.name;
        draftState.metaForm = {
          metadata: get(state, ['modifiedData', 'metadatas', action.name, 'edit'], {}),
          size:
            getFieldSize(action.name, state.modifiedData?.layouts?.edit) ?? getDefaultInputSize(),
        };

        break;
      }
      case 'SUBMIT_META_FORM': {
        set(
          draftState,
          ['modifiedData', 'metadatas', state.metaToEdit, 'edit'],
          state.metaForm.metadata
        );

        const layoutsCopy = cloneDeep(get(state, layoutPathEdit, []));
        const nextLayoutValue = setFieldSize(state.metaToEdit, state.metaForm.size, layoutsCopy);

        if (nextLayoutValue.length > 0) {
          set(draftState, layoutPathEdit, formatLayout(nextLayoutValue));
        }

        break;
      }
      case 'SUBMIT_SUCCEEDED': {
        draftState.initialData = state.modifiedData;
        break;
      }
      case 'UNSET_FIELD_TO_EDIT': {
        draftState.metaToEdit = '';
        draftState.metaForm = {};
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
