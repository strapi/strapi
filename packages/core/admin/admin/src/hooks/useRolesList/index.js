import { useEffect, useReducer, useCallback } from 'react';
import { useFetchClient, useNotification, useAPIErrorHandler } from '@strapi/helper-plugin';

import init from './init';
import reducer, { initialState } from './reducer';

const useRolesList = (shouldFetchData = true) => {
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const [{ roles, isLoading }, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, shouldFetchData)
  );
  const { get } = useFetchClient();

  const fetchRolesList = useCallback(async () => {
    try {
      dispatch({
        type: 'GET_DATA',
      });

      const {
        data: { data },
      } = await get('/admin/roles');

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    } catch (err) {
      dispatch({
        type: 'GET_DATA_ERROR',
      });

      toggleNotification({
        type: 'warning',
        message: formatAPIError(err),
      });
    }
  }, [toggleNotification, formatAPIError, get]);

  useEffect(() => {
    if (shouldFetchData) {
      fetchRolesList();
    }
  }, [fetchRolesList, shouldFetchData]);

  return { roles, isLoading, getData: fetchRolesList };
};

export default useRolesList;
