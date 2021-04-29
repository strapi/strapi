import { useEffect, useReducer } from 'react';
import { request } from 'strapi-helper-plugin';
import { get, has, omit } from 'lodash';
import { checkFormValidity, formatAPIErrors } from '../../utils';
import { initialState, reducer } from './reducer';
import init from './init';

const useSettingsForm = (endPoint, schema, cbSuccess, fieldsToPick) => {
  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderButtonLoader, showHeaderLoader },
    dispatch,
  ] = useReducer(reducer, initialState, () => init(initialState, fieldsToPick));

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
        console.error(err.response);
        strapi.notification.toggle({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }
    };

    if (endPoint) {
      getData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endPoint]);

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

  const handleSubmit = async e => {
    e.preventDefault();

    const errors = await checkFormValidity(modifiedData, schema);

    dispatch({
      type: 'SET_ERRORS',
      errors: errors || {},
    });

    if (!errors) {
      try {
        strapi.lockAppWithOverlay();

        dispatch({
          type: 'ON_SUBMIT',
        });

        const cleanedData = omit(modifiedData, ['confirmPassword', 'registrationToken']);

        if (cleanedData.roles) {
          cleanedData.roles = cleanedData.roles.map(role => role.id);
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

        strapi.notification.toggle({
          type: 'success',
          message: { id: 'notification.success.saved' },
        });
      } catch (err) {
        const data = get(err, 'response.payload', { data: {} });

        if (has(data, 'data') && typeof data.data === 'string') {
          strapi.notification.toggle({
            type: 'warning',
            message: data.data,
          });
        } else {
          strapi.notification.toggle({
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
        strapi.unlockApp();
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
