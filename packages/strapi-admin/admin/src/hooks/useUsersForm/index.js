import { useEffect, useReducer } from 'react';
import { request } from 'strapi-helper-plugin';
import { get, omit } from 'lodash';
import { checkFormValidity, formatAPIErrors } from '../../utils';
import { initialState, reducer } from './reducer';
import init from './init';

const useUsersForm = (endPoint, schema, cbSuccess) => {
  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderLoader },
    dispatch,
  ] = useReducer(reducer, initialState, init);

  useEffect(() => {
    const getData = async () => {
      try {
        const { data } = await request(endPoint, { method: 'GET' });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        console.error(err.response);
      }
    };

    if (endPoint) {
      getData();
    }
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

        const { data } = await request(endPoint, {
          method: 'PUT',
          body: omit(modifiedData, ['confirmPassword']),
        });

        cbSuccess(data);

        dispatch({
          type: 'ON_SUBMIT_SUCCEEDED',
          data,
        });

        strapi.notification.success('notification.success.saved');
      } catch (err) {
        const data = get(err, 'response.payload', { data: {} });
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
    { formErrors, initialData, isLoading, modifiedData, showHeaderLoader },
    dispatch,
    { handleCancel, handleChange, handleSubmit },
  ];
};

export default useUsersForm;
