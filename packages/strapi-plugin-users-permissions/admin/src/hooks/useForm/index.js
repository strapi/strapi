import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useUserPermissions, request } from 'strapi-helper-plugin';
import { getRequestURL } from '../../utils';
import reducer, { initialState } from './reducer';

const useUserForm = (endPoint, permissions) => {
  const { isLoading: isLoadingForPermissions, allowedActions } = useUserPermissions(permissions);
  const [{ formErrors, initialData, isLoading, modifiedData }, dispatch] = useReducer(
    reducer,
    initialState
  );

  const isMounted = useRef(true);

  const abortController = new AbortController();
  const { signal } = abortController;

  useEffect(() => {
    const getData = async () => {
      try {
        dispatch({
          type: 'GET_DATA',
        });

        const data = await request(getRequestURL(endPoint), { method: 'GET', signal });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        // The user aborted the request
        if (isMounted.current) {
          dispatch({
            type: 'GET_DATA_ERROR',
          });
          console.error(err);
          strapi.notification.toggle({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        }
      }
    };

    if (!isLoadingForPermissions) {
      getData();
    }

    return () => {
      abortController.abort();
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingForPermissions, endPoint]);

  const handleChange = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  }, []);

  const dispatchResetForm = useCallback(() => {
    dispatch({
      type: 'RESET_FORM',
    });
  }, []);

  const dispatchSetFormErrors = useCallback(errors => {
    dispatch({ type: 'SET_ERRORS', errors });
  }, []);

  const dispatchSubmitSucceeded = useCallback(() => {
    dispatch({
      type: 'ON_SUBMIT_SUCCEEDED',
    });
  }, []);

  return {
    allowedActions,
    dispatch,
    dispatchResetForm,
    dispatchSetFormErrors,
    dispatchSubmitSucceeded,
    formErrors,
    handleChange,
    initialData,
    isLoading,
    isLoadingForPermissions,
    modifiedData,
  };
};

export default useUserForm;
