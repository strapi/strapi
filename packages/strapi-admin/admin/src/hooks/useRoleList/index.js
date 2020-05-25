import { useEffect, useReducer } from 'react';
import { request } from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';

const useRoleList = () => {
  const [{ roles, isLoading }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    fetchRoleList();
  }, []);

  const fetchRoleList = async () => {
    try {
      const { data } = await request('/admin/roles', { method: 'GET' });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    } catch (err) {
      console.error(err.response);
    }
  };

  return { roles, isLoading };
};

export default useRoleList;
