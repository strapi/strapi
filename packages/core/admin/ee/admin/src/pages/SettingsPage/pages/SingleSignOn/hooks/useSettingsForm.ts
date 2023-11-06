import * as React from 'react';

import {
  getYupInnerErrors,
  useFetchClient,
  useNotification,
  useOverlayBlocker,
} from '@strapi/helper-plugin';
import produce from 'immer';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import set from 'lodash/set';
import { ValidationError } from 'yup';

import { formatAPIErrors } from '../../../../../../../../admin/src/utils/formatAPIErrors';

interface GetDataSucceedAction {
  type: 'GET_DATA_SUCCEEDED';
  data: {
    [key: string]: unknown;
  };
  fieldsToPick: string[];
}

interface OnCancelAction {
  type: 'ON_CANCEL';
}

interface OnChangeAction {
  type: 'ON_CHANGE';
  keys: string;
  value: unknown;
}

interface OnSubmitAction {
  type: 'ON_SUBMIT';
}

interface OnSubmitSucceedAction {
  type: 'ON_SUBMIT_SUCCEEDED';
  data: {
    [key: string]: unknown;
  };
}

interface SetErrorsAction {
  type: 'SET_ERRORS';
  errors: Record<string, unknown>;
}

interface InitialState {
  fieldsToPick: string[];
  formErrors?: Record<string, unknown>;
  initialData: Record<string, unknown>;
  isLoading: boolean;
  modifiedData: Record<string, unknown>;
  showHeaderButtonLoader: boolean;
  showHeaderLoader: boolean;
}

const initialState: InitialState = {
  fieldsToPick: [],
  formErrors: {},
  initialData: {},
  isLoading: true,
  modifiedData: {},
  showHeaderButtonLoader: false,
  showHeaderLoader: true,
};

type Action =
  | GetDataSucceedAction
  | OnCancelAction
  | OnChangeAction
  | OnSubmitAction
  | OnSubmitSucceedAction
  | SetErrorsAction;

const reducer = (state: typeof initialState, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.showHeaderLoader = false;
        draftState.initialData = pick(action.data, state.fieldsToPick);
        draftState.modifiedData = pick(action.data, state.fieldsToPick);
        break;
      }
      case 'ON_CANCEL': {
        draftState.modifiedData = state.initialData;
        draftState.formErrors = {};
        break;
      }
      case 'ON_CHANGE': {
        if (action.keys.includes('username') && !action.value) {
          set(draftState.modifiedData, action.keys.split('.'), null);
        } else {
          set(draftState.modifiedData, action.keys.split('.'), action.value);
        }
        break;
      }
      case 'ON_SUBMIT': {
        draftState.showHeaderButtonLoader = true;
        break;
      }
      case 'ON_SUBMIT_SUCCEEDED': {
        draftState.initialData = pick(action.data, state.fieldsToPick);
        draftState.modifiedData = pick(action.data, state.fieldsToPick);
        draftState.showHeaderButtonLoader = false;
        break;
      }
      case 'SET_ERRORS': {
        draftState.formErrors = action.errors;
        draftState.showHeaderButtonLoader = false;
        break;
      }
      default:
        return draftState;
    }
  });

const checkFormValidity = async (data: Record<string, unknown>, schema: any) => {
  let errors = null;

  try {
    await schema.validate(data, { abortEarly: false });
  } catch (err) {
    if (err instanceof ValidationError) {
      errors = getYupInnerErrors(err);
    }
  }

  return errors;
};

/**
 * TODO: refactor this, it's confusing and hard to read.
 * It's also only used in `Settings/pages/SingleSignOn` so it can
 * probably be deleted and everything written there...
 */
export const useSettingsForm = (
  schema: Record<string, unknown>,
  cbSuccess: (data: any) => void,
  fieldsToPick: string[]
) => {
  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderButtonLoader, showHeaderLoader },
    dispatch,
  ] = React.useReducer(reducer, { ...initialState, fieldsToPick });
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();

  const { get, put } = useFetchClient();

  React.useEffect(() => {
    const getData = async () => {
      try {
        const {
          data: { data },
        } = await get('/admin/providers/options');

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
          fieldsToPick,
        });
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }
    };

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    dispatch({
      type: 'ON_CANCEL',
    });
  };

  const handleChange = ({
    target: { name, value },
  }: {
    target: { name: string; value?: unknown };
  }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  const setField = (fieldName: string, value: unknown) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: fieldName,
      value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = await checkFormValidity(modifiedData, schema);

    dispatch({
      type: 'SET_ERRORS',
      errors: errors || {},
    });

    if (!errors) {
      try {
        // @ts-expect-error - context assertation
        lockApp();

        dispatch({
          type: 'ON_SUBMIT',
        });
        const cleanedData = omit(modifiedData, ['confirmPassword', 'registrationToken']);

        if (cleanedData.roles) {
          // @ts-expect-error hooks needs refactoring anyways
          cleanedData.roles = cleanedData.roles.map((role) => role.id);
        }
        if (cleanedData.ssoLockedRoles) {
          // @ts-expect-error hooks needs refactoring anyways
          cleanedData.ssoLockedRoles = [...new Set(cleanedData.ssoLockedRoles)];
        }

        const {
          data: { data },
        } = await put('/admin/providers/options', cleanedData);

        cbSuccess(data);

        dispatch({
          type: 'ON_SUBMIT_SUCCEEDED',
          data,
        });

        toggleNotification({
          type: 'success',
          message: { id: 'notification.success.saved' },
        });
      } catch (err) {
        // @ts-expect-error hooks needs refactoring anyways
        const data = err?.response?.payload ?? { data: {} };

        if (!!data?.data && typeof data.data === 'string') {
          toggleNotification({
            type: 'warning',
            message: data.data,
          });
        } else {
          toggleNotification({
            type: 'warning',
            message: data.message,
          });
        }

        const apiErrors = formatAPIErrors(data);

        dispatch({
          type: 'SET_ERRORS',
          errors: apiErrors,
        });
      } finally {
        // @ts-expect-error - context assertation
        unlockApp();
      }
    }
  };

  return [
    { formErrors, initialData, isLoading, modifiedData, showHeaderButtonLoader, showHeaderLoader },
    dispatch,
    { handleCancel, handleChange, handleSubmit, setField },
  ] as const;
};
