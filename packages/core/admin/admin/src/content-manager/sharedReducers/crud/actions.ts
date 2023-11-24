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
import { CrudState } from './reducer';

interface GetDataAction {
  type: typeof GET_DATA;
}

const getData = () => {
  return {
    type: GET_DATA,
  } satisfies GetDataAction;
};

interface GetDataSucceededAction extends Pick<CrudState, 'data'> {
  type: typeof GET_DATA_SUCCEEDED;
  setModifiedDataOnly?: boolean;
}

const getDataSucceeded = (data: GetDataSucceededAction['data']) =>
  ({
    type: GET_DATA_SUCCEEDED,
    data,
  } satisfies GetDataSucceededAction);

interface InitFormAction extends Partial<Pick<CrudState, 'data'>> {
  type: typeof INIT_FORM;
  rawQuery?: unknown;
  isSingleType?: boolean;
}

const initForm = (rawQuery?: InitFormAction['rawQuery'], isSingleType = false) =>
  ({
    type: INIT_FORM,
    rawQuery,
    isSingleType,
  } satisfies InitFormAction);

interface ResetPropsAction {
  type: typeof RESET_PROPS;
}

const resetProps = () => ({ type: RESET_PROPS } satisfies ResetPropsAction);

interface SetDataStructuresAction
  extends Pick<CrudState, 'componentsDataStructure' | 'contentTypeDataStructure'> {
  type: typeof SET_DATA_STRUCTURES;
}

const setDataStructures = (
  componentsDataStructure: SetDataStructuresAction['componentsDataStructure'],
  contentTypeDataStructure: SetDataStructuresAction['contentTypeDataStructure']
) =>
  ({
    type: SET_DATA_STRUCTURES,
    componentsDataStructure,
    contentTypeDataStructure,
  } satisfies SetDataStructuresAction);

interface SetStatusAction extends Pick<CrudState, 'status'> {
  type: typeof SET_STATUS;
}

const setStatus = (status: SetStatusAction['status']) =>
  ({
    type: SET_STATUS,
    status,
  } satisfies SetStatusAction);

interface SubmitSucceededAction extends Pick<CrudState, 'data'> {
  type: typeof SUBMIT_SUCCEEDED;
}

const submitSucceeded = (data: SubmitSucceededAction['data']) =>
  ({
    type: SUBMIT_SUCCEEDED,
    data,
  } satisfies SubmitSucceededAction);

interface ClearSetModifiedDataOnlyAction {
  type: typeof CLEAR_SET_MODIFIED_DATA_ONLY;
}

const clearSetModifiedDataOnly = () =>
  ({
    type: CLEAR_SET_MODIFIED_DATA_ONLY,
  } satisfies ClearSetModifiedDataOnlyAction);

export {
  getData,
  getDataSucceeded,
  initForm,
  resetProps,
  setDataStructures,
  setStatus,
  submitSucceeded,
  clearSetModifiedDataOnly,
};

type CrudAction =
  | GetDataAction
  | GetDataSucceededAction
  | InitFormAction
  | ResetPropsAction
  | SetDataStructuresAction
  | SetStatusAction
  | SubmitSucceededAction
  | ClearSetModifiedDataOnlyAction;

export type {
  GetDataAction,
  GetDataSucceededAction,
  InitFormAction,
  ResetPropsAction,
  SetDataStructuresAction,
  SetStatusAction,
  SubmitSucceededAction,
  ClearSetModifiedDataOnlyAction,
  CrudAction,
};
