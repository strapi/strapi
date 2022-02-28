import { useEffect, useReducer, useRef } from 'react';
import { request, useNotification } from '@strapi/helper-plugin';
import { get } from 'lodash';
import init from './init';
import pluginId from '../../pluginId';
import reducer, { initialState } from './reducer';

const useRolesList = (shouldFetchData = true) => {
  const [{ roles, isLoading }, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, shouldFetchData)
  );
  const toggleNotification = useNotification();

  const isMounted = useRef(true);
  const abortController = new AbortController();
  const { signal } = abortController;

  useEffect(() => {
    if (shouldFetchData) {
      fetchRolesList();
    }

    return () => {
      abortController.abort();
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetchData]);

  const fetchRolesList = async () => {
    try {
      dispatch({
        type: 'GET_DATA',
      });

      const { roles } = await request(`/${pluginId}/roles`, { method: 'GET', signal });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data: roles,
      });
    } catch (err) {
      const message = get(err, ['response', 'payload', 'message'], 'An error occured');

      if (isMounted.current) {
        dispatch({
          type: 'GET_DATA_ERROR',
        });

        if (message !== 'Forbidden') {
          toggleNotification({
            type: 'warning',
            message,
          });
        }
      }
    }
  };

  return { roles, isLoading, getData: fetchRolesList };
};

export default useRolesList;
