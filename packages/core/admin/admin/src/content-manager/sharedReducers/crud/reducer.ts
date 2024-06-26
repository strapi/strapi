import { Attribute } from '@strapi/types';
import produce from 'immer';

import {
  CLEAR_SET_MODIFIED_DATA_ONLY,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  INIT_FORM,
  RESET_PROPS,
  SET_DATA_STRUCTURES,
  SET_STATUS,
  SUBMIT_SUCCEEDED,
} from './constants';

import type { CrudAction } from './actions';

interface EntityData {
  [key: string]: Attribute.GetValue<Attribute.Any>;
}

interface CrudState {
  componentsDataStructure: EntityData;
  contentTypeDataStructure: EntityData;
  isLoading: boolean;
  data: EntityData | null;
  status: string;
  setModifiedDataOnly: boolean;
}

const initialState = {
  componentsDataStructure: {},
  contentTypeDataStructure: {},
  isLoading: true,
  data: null,
  status: 'resolved',
  setModifiedDataOnly: false,
} satisfies CrudState;

const reducer = (state: CrudState = initialState, action: CrudAction) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case GET_DATA: {
        draftState.isLoading = true;
        draftState.data = null;
        break;
      }
      case GET_DATA_SUCCEEDED: {
        draftState.isLoading = false;
        draftState.data = action.data;
        draftState.setModifiedDataOnly = action.setModifiedDataOnly ?? false;
        break;
      }
      case INIT_FORM: {
        if (action.data) {
          draftState.isLoading = false;
          draftState.data = action.data;

          break;
        }

        draftState.isLoading = false;
        draftState.data = state.contentTypeDataStructure;
        break;
      }
      case RESET_PROPS: {
        return initialState;
      }
      case SET_DATA_STRUCTURES: {
        draftState.componentsDataStructure = action.componentsDataStructure;
        draftState.contentTypeDataStructure = action.contentTypeDataStructure;
        break;
      }
      case SET_STATUS: {
        draftState.status = action.status;
        break;
      }
      case SUBMIT_SUCCEEDED: {
        draftState.data = action.data;
        break;
      }
      case CLEAR_SET_MODIFIED_DATA_ONLY: {
        draftState.setModifiedDataOnly = false;
        break;
      }
      default:
        return draftState;
    }
  });

export { reducer, initialState };
export type { CrudState, EntityData, CrudAction };
