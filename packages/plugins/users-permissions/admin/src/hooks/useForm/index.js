import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useRBAC, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { getRequestURL } from '../../utils';
import reducer, { initialState } from './reducer';

const useUserForm = (endPoint, permissions) => {
  const { isLoading: isLoadingForPermissions, allowedActions } = useRBAC(permissions);
  const [{ isLoading, modifiedData }, dispatch] = useReducer(reducer, initialState);
  const toggleNotification = useNotification();
  const isMounted = useRef(true);

  const { get } = useFetchClient();

  useEffect(() => {
    const getData = async () => {
      try {
        dispatch({
          type: 'GET_DATA',
        });

        const { data } = await get(getRequestURL(endPoint));

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
      isMounted.current = false;
    };
  }, [isLoadingForPermissions, endPoint, get, toggleNotification]);

  const dispatchSubmitSucceeded = useCallback((data) => {
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
