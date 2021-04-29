import { useEffect, useReducer } from 'react';
import { request } from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';

const useFetchPermissionsLayout = id => {
  const [{ data, error, isLoading }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const getData = async () => {
      dispatch({
        type: 'GET_DATA',
      });

      const { data } = await request('/admin/permissions', {
        method: 'GET',
        params: { role: id },
      });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    };

    getData();
  }, [id]);

  return { data, error, isLoading };
};

export default useFetchPermissionsLayout;
