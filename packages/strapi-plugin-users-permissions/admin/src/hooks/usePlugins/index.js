import { useEffect, useReducer } from 'react';
import { request } from 'strapi-helper-plugin';
import { get } from 'lodash';
import init from './init';
import pluginId from '../../pluginId';
import reducer, { initialState } from './reducer';
import { formatPolicies } from '../../utils';

const usePlugins = (shouldFetchData = true) => {
  const [{ permissions, routes, policies, isLoading }, dispatch] = useReducer(
    reducer,
    initialState,
    () => init(initialState, shouldFetchData)
  );

  useEffect(() => {
    if (shouldFetchData) {
      fetchPlugins();
    }
  }, [shouldFetchData]);

  const fetchPlugins = async () => {
    try {
      dispatch({
        type: 'GET_DATA',
      });

      const [{ permissions }, { routes }, { policies }] = await Promise.all(
        [`/${pluginId}/permissions`, `/${pluginId}/routes`, `/${pluginId}/policies`].map(endpoint =>
          request(endpoint, { method: 'GET' })
        )
      );

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        permissions,
        routes,
        policies: [
          { name: 'users-permissions.Policies.InputSelect.empty', value: '' },
          ...formatPolicies(policies),
        ],
      });
    } catch (err) {
      const message = get(err, ['response', 'payload', 'message'], 'An error occured');

      dispatch({
        type: 'GET_DATA_ERROR',
      });

      if (message !== 'Forbidden') {
        strapi.notification.error(message);
      }
    }
  };

  return { permissions, routes, policies, isPermissionsLoading: isLoading, getData: fetchPlugins };
};

export default usePlugins;
