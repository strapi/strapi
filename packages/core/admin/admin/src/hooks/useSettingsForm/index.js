import { useEffect, useReducer } from 'react';
import {
  request,
  useNotification,
  useOverlayBlocker,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import { get, omit } from 'lodash';
import { checkFormValidity, formatAPIErrors } from '../../utils';
import { initialState, reducer } from './reducer';
import init from './init';

const useSettingsForm = (endPoint, schema, cbSuccess, fieldsToPick) => {
  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderButtonLoader, showHeaderLoader },
    dispatch,
  ] = useReducer(reducer, initialState, () => init(initialState, fieldsToPick));
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { formatAPIError } = useAPIErrorHandler();

  useEffect(() => {
    const getData = async () => {
      try {
        const { data } = await request(endPoint, { method: 'GET' });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
          fieldsToPick,
        });
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      }
    };

    if (endPoint) {
      getData();
    }
  }, [endPoint, fieldsToPick, formatAPIError, toggleNotification]);

  const handleCancel = () => {
    dispatch({
      type: 'ON_CANCEL',
    });
  };

  const handleChange = ({ target: { name, value, type: inputType } }) => {
    dispatch({
      type: 'ON_CHANGE',
      inputType,
      keys: name,
      value,
    });
  };

  const setField = (fieldName, value) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: fieldName,
      value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = await checkFormValidity(modifiedData, schema);

    dispatch({
      type: 'SET_ERRORS',
      errors: errors || {},
    });

    if (!errors) {
      try {
        lockApp();

        dispatch({
          type: 'ON_SUBMIT',
        });

        const cleanedData = omit(modifiedData, ['confirmPassword', 'registrationToken']);

        if (cleanedData.roles) {
          cleanedData.roles = cleanedData.roles.map((role) => role.id);
        }

        const { data } = await request(endPoint, {
          method: 'PUT',
          body: cleanedData,
        });

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
        const data = get(err, 'response.payload', { data: {} });
        const apiErrors = formatAPIErrors(data);

        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });

        dispatch({
          type: 'SET_ERRORS',
          errors: apiErrors,
        });
      } finally {
        unlockApp();
      }
    }
  };

  return [
    { formErrors, initialData, isLoading, modifiedData, showHeaderButtonLoader, showHeaderLoader },
    dispatch,
    { handleCancel, handleChange, handleSubmit, setField },
  ];
};

export default useSettingsForm;
