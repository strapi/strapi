import produce from 'immer'; // current
import get from 'lodash/get';
import set from 'lodash/set';

import { arrayMoveItem } from '../../utils/arrayMoveItem';

import type { SettingsViewContentTypeLayout } from '../../utils/layouts';

export interface ListSettingsViewState {
  fieldForm: {
    label?: string;
    sortable?: boolean;
  };
  fieldToEdit: string;
  initialData: SettingsViewContentTypeLayout | null;
  modifiedData: SettingsViewContentTypeLayout | null;
}

export interface AddFieldAction {
  item: string;
  type: 'ADD_FIELD';
}

export interface MoveFieldAction {
  atIndex: number;
  originalIndex: number;
  type: 'MOVE_FIELD';
}

export interface OnChangeAction {
  keys: string;
  type: 'ON_CHANGE';
  value: string | number | boolean;
}

export interface OnChangeFieldMetasAction {
  name: string;
  type: 'ON_CHANGE_FIELD_METAS';
  value: string | boolean;
}

export interface RemoveFieldAction {
  index: number;
  type: 'REMOVE_FIELD';
}

export interface SetFieldToEditAction {
  fieldToEdit: string;
  type: 'SET_FIELD_TO_EDIT';
}

export interface UnsetFieldToEditAction {
  type: 'UNSET_FIELD_TO_EDIT';
}

export interface SubmitFieldFormAction {
  type: 'SUBMIT_FIELD_FORM';
}

export interface SetDataAction {
  data: SettingsViewContentTypeLayout | null;
  type: 'SET_DATA';
}

type Action =
  | AddFieldAction
  | MoveFieldAction
  | OnChangeAction
  | OnChangeFieldMetasAction
  | RemoveFieldAction
  | SetFieldToEditAction
  | UnsetFieldToEditAction
  | SubmitFieldFormAction
  | SetDataAction;

const initialState = {
  fieldForm: {},
  fieldToEdit: '',
  initialData: null,
  modifiedData: null,
} satisfies ListSettingsViewState;

const reducer = (state: ListSettingsViewState, action: Action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
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
        const layoutFieldList: SettingsViewContentTypeLayout['layouts']['list'] = get(
          state,
          layoutFieldListPath,
          []
        );
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
      /**
       * TODO: refactor this so we don't need to do it, do we actually need a reducer?
       */
      case 'SET_DATA': {
        draftState.initialData = action.data;
        draftState.modifiedData = action.data;
        break;
      }
      default:
        return draftState;
    }
  });

export { reducer, initialState };
