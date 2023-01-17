import { useCallback, useEffect, useReducer } from 'react';
import { useNotification } from '@strapi/helper-plugin';
import { get } from 'lodash';
import init from './init';
import pluginId from '../../pluginId';
import { cleanPermissions } from '../../utils';
import axiosInstance from '../../utils/axiosInstance';
import reducer, { initialState } from './reducer';

const usePlugins = (shouldFetchData = true) => {
  const toggleNotification = useNotification();
  const [{ permissions, routes, isLoading }, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, shouldFetchData)
  );

  const fetchPlugins = useCallback(async () => {
    try {
      dispatch({
        type: 'GET_DATA',
      });

      const [{ permissions }, { routes }] = await Promise.all(
        [`/${pluginId}/permissions`, `/${pluginId}/routes`].map(async (endpoint) => {
          const res = await axiosInstance.get(endpoint);

          return res.data;
        })
      );

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        permissions: cleanPermissions(permissions),
        routes,
      });
    } catch (err) {
      const message = get(err, ['response', 'payload', 'message'], 'An error occured');

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
  }, [toggleNotification]);

  useEffect(() => {
    if (shouldFetchData) {
      fetchPlugins();
    }
  }, [fetchPlugins, shouldFetchData]);

  return {
    permissions,
    routes,
    getData: fetchPlugins,
    isLoading,
  };
};

export default usePlugins;
