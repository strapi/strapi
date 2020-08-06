import { useReducer, useEffect } from 'react';
import { request } from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';

import pluginId from '../../pluginId';

const useFetchRole = id => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (id) {
      fetchRole(id);
    } else {
      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        role: {},
        permissions: {},
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRole = async roleId => {
    try {
      const { role } = await request(`/${pluginId}/roles/${roleId}`, { method: 'GET' });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        role,
      });
    } catch (err) {
      console.error(err);

      dispatch({
        type: 'GET_DATA_ERROR',
      });
      strapi.notification.error('notification.error');
    }
  };

  return state;
};

export default useFetchRole;
