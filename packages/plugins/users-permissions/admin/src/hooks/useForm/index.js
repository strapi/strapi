import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useRBAC, request, useNotification } from '@strapi/helper-plugin';
import { getRequestURL } from '../../utils';
import reducer, { initialState } from './reducer';

const useUserForm = (endPoint, permissions) => {
  const { isLoading: isLoadingForPermissions, allowedActions } = useRBAC(permissions);
  const [{ isLoading, modifiedData }, dispatch] = useReducer(reducer, initialState);
  const toggleNotification = useNotification();
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
          toggleNotification({
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

  const dispatchSubmitSucceeded = useCallback(data => {
    dispatch({
      type: 'ON_SUBMIT_SUCCEEDED',
      data,
    });
  }, []);

  return {
    allowedActions,
    dispatchSubmitSucceeded,
    isLoading,
    isLoadingForPermissions,
    modifiedData,
  };
};

export default useUserForm;
