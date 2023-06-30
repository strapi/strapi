import { useCallback, useEffect, useReducer, useRef } from 'react';

import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import get from 'lodash/get';

import pluginId from '../../pluginId';

import init from './init';
import reducer, { initialState } from './reducer';

const useRolesList = (shouldFetchData = true) => {
  const [{ roles, isLoading }, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, shouldFetchData)
  );
  const toggleNotification = useNotification();

  const isMounted = useRef(true);
  const fetchClient = useFetchClient();

  const fetchRolesList = useCallback(async () => {
    try {
      dispatch({
        type: 'GET_DATA',
      });

      const {
        data: { roles },
      } = await fetchClient.get(`/${pluginId}/roles`);

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
  }, [fetchClient, toggleNotification]);

  useEffect(() => {
    if (shouldFetchData) {
      fetchRolesList();
    }

    return () => {
      isMounted.current = false;
    };
  }, [shouldFetchData, fetchRolesList]);

  return { roles, isLoading, getData: fetchRolesList };
};

export default useRolesList;
