import produce from 'immer';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import set from 'lodash/set';

import { arrayMoveItem } from '../../../../utils/arrayMoveItem';
import { formatLayout, getFieldSize, setFieldSize } from '../../utils/layout';

import type { SettingsViewComponentLayout, SettingsViewLayout } from '../../../../utils/layouts';

const DEFAULT_FIELD_SIZE = 6;

const initialState = {
  fieldForm: {},
  componentLayouts: {},
  metaToEdit: '',
  metaForm: null,
  initialData: null,
  modifiedData: null,
} satisfies EditSettingsViewState;

interface SettingsViewLayoutModified extends Omit<SettingsViewLayout, 'layouts'> {
  layouts: {
    edit: Array<{
      rowId: number;
      rowContent: Array<{
        name: string;
        size: number;
      }>;
    }>;
    list: SettingsViewLayout['layouts']['list'];
  };
}

export interface EditSettingsViewState {
  fieldForm: Record<string, unknown>;
  componentLayouts: Record<string, SettingsViewComponentLayout>;
  metaToEdit: string;
  metaForm: {
    metadata: Record<string, unknown>;
    size: number;
  } | null;
  initialData: SettingsViewLayoutModified | null;
  modifiedData: SettingsViewLayoutModified | null;
}

export interface MoveRowAction {
  fromIndex: number;
  toIndex: number;
  type: 'MOVE_ROW';
}

export interface OnAddFieldAction {
  fieldSizes: Record<string, { default: number }>;
  name: string;
  type: 'ON_ADD_FIELD';
}

export interface OnChangeAction {
  keys: string[];
  type: 'ON_CHANGE';
  value: string | number | boolean | null;
}

export interface OnChangeMetaAction {
  keys: string[];
  type: 'ON_CHANGE_META';
  value: string | number | boolean;
}

export interface OnChangeSizeAction {
  type: 'ON_CHANGE_SIZE';
  value: number;
}

export interface RemoveFieldAction {
  fieldIndex: number;
  rowIndex: number;
  type: 'REMOVE_FIELD';
}

export interface ReorderDiffRowAction {
  dragIndex: number;
  dragRowIndex: number;
  hoverIndex: number;
  hoverRowIndex: number;
  type: 'REORDER_DIFF_ROW';
}

export interface ReorderRowAction {
  dragIndex: number;
  dragRowIndex: number;
  hoverIndex: number;
  type: 'REORDER_ROW';
}

export interface SetFieldToEditAction {
  name: string;
  type: 'SET_FIELD_TO_EDIT';
}

export interface SubmitMetaFormAction {
  type: 'SUBMIT_META_FORM';
}

export interface SubmitSucceededAction {
  type: 'SUBMIT_SUCCEEDED';
}

export interface SetDataAction {
  data: EditSettingsViewState;
  type: 'SET_DATA';
}

export type Action =
  | MoveRowAction
  | OnAddFieldAction
  | OnChangeAction
  | OnChangeMetaAction
  | OnChangeSizeAction
  | RemoveFieldAction
  | ReorderDiffRowAction
  | ReorderRowAction
  | SetFieldToEditAction
  | SubmitMetaFormAction
  | SubmitSucceededAction
  | SetDataAction;

const reducer = (state: EditSettingsViewState, action: Action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
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
        const attribute = get(newState, ['modifiedData', 'attributes', action.name]);

        // Get the default size, checking custom fields first, then the type and generic defaults
        const size =
          action.fieldSizes[attribute?.customField]?.default ??
          action.fieldSizes[attribute?.type]?.default ??
          DEFAULT_FIELD_SIZE;

        const listSize = get(newState, layoutPathEdit, []).length;
        const actualRowContentPath = [...layoutPathEdit, listSize - 1, 'rowContent'];
        const rowContentToSet = get(newState, actualRowContentPath, []);
        const newList = get(newState, layoutPathEdit, []);

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
      case 'REMOVE_FIELD': {
        const row: SettingsViewLayoutModified['layouts']['edit'][0]['rowContent'] = get(
          state,
          [...layoutPathEdit, action.rowIndex, 'rowContent'],
          []
        );

        const newState = cloneDeep(state);

        if (row.length === 1 || (row.length === 2 && get(row, [1, 'name'], '') === '_TEMP_')) {
          const currentRowFieldList: SettingsViewLayoutModified['layouts']['edit'] = get(
            state,
            layoutPathEdit,
            []
          );

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
        const actualRowContent: SettingsViewLayoutModified['layouts']['edit'][0]['rowContent'] =
          get(state, [...layoutPathEdit, action.dragRowIndex, 'rowContent'], []);

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
        const newState = cloneDeep(state);

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
        const rowPath = [...layoutPathEdit, action.dragRowIndex, 'rowContent'];
        const rowContent = get(newState, rowPath, []);

        const reorderedRow = arrayMoveItem(rowContent, action.dragIndex, action.hoverIndex);

        set(newState, rowPath, reorderedRow);

        const updatedList = formatLayout(get(newState, layoutPathEdit, []));
        set(draftState, layoutPathEdit, updatedList);
        break;
      }
      case 'SET_FIELD_TO_EDIT': {
        draftState.metaToEdit = action.name;
        draftState.metaForm = {
          metadata: get(state, ['modifiedData', 'metadatas', action.name, 'edit'], {}),
          size: getFieldSize(action.name, state.modifiedData?.layouts?.edit) ?? DEFAULT_FIELD_SIZE,
        };

        break;
      }
      case 'SUBMIT_META_FORM': {
        set(
          draftState,
          ['modifiedData', 'metadatas', state.metaToEdit, 'edit'],
          // TODO: review this to remove the non-null assertion.
          state.metaForm!.metadata
        );

        const layoutsCopy = cloneDeep(get(state, layoutPathEdit, []));
        // TODO: review this to remove the non-null assertion.
        const nextLayoutValue = setFieldSize(state.metaToEdit, state.metaForm!.size, layoutsCopy);

        if (nextLayoutValue.length > 0) {
          set(draftState, layoutPathEdit, formatLayout(nextLayoutValue));
        }

        break;
      }
      case 'SUBMIT_SUCCEEDED': {
        draftState.initialData = state.modifiedData;
        break;
      }
      case 'SET_DATA': {
        draftState.componentLayouts = action.data.componentLayouts;
        draftState.initialData = action.data.initialData;
        draftState.modifiedData = action.data.modifiedData;
        draftState.fieldForm = action.data.fieldForm;
        draftState.metaForm = action.data.metaForm;
        draftState.metaToEdit = action.data.metaToEdit;

        break;
      }
      default:
        return draftState;
    }
  });

export { reducer, initialState };
