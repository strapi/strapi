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
  initialData: SettingsViewContentTypeLayout;
  modifiedData: SettingsViewContentTypeLayout;
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

type Action =
  | AddFieldAction
  | MoveFieldAction
  | OnChangeAction
  | OnChangeFieldMetasAction
  | RemoveFieldAction
  | SetFieldToEditAction
  | UnsetFieldToEditAction
  | SubmitFieldFormAction;

const initialState = {
  fieldForm: {},
  fieldToEdit: '',
  initialData: {},
  modifiedData: {},
};

const reducer = (state: ListSettingsViewState, action: Action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState: ListSettingsViewState) => {
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
        const layoutFieldList: ListSettingsViewState['modifiedData']['layouts']['list'] = get(
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
      default:
        return draftState;
    }
  });

export { reducer, initialState };
