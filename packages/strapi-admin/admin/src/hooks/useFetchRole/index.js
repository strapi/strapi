import { useReducer, useEffect } from 'react';
import { request } from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';

const useFetchRole = id => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    fetchRole(id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRole = async roleId => {
    try {
      const { data } = await request(`/admin/roles/${roleId}`, { method: 'GET' });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    } catch (err) {
      dispatch({
        type: 'GET_DATA_ERROR',
      });
      strapi.notification.error('notification.error');
    }
  };

  return state;
};

export default useFetchRole;
