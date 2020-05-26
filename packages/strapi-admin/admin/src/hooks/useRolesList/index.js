import { useEffect, useReducer } from 'react';
import { request } from 'strapi-helper-plugin';
import { get } from 'lodash';

import reducer, { initialState } from './reducer';

const useRolesList = () => {
  const [{ roles, isLoading }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    fetchRolesList();
  }, []);

  const fetchRolesList = async () => {
    try {
      const { data } = await request('/admin/roles', { method: 'GET' });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    } catch (err) {
      const message = get(err, ['response', 'payload', 'message'], 'An error occured');

      strapi.notification.error(message);
      dispatch({
        type: 'GET_DATA_ERROR',
      });
    }
  };

  return { roles, isLoading };
};

export default useRolesList;
