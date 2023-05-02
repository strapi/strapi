import { useEffect, useReducer } from 'react';
import { useFetchClient } from '@strapi/helper-plugin';

import reducer, { initialState } from './reducer';

/**
 * TODO: refactor this to use react-query and move it to the `Roles` SettingsPage
 */
const useFetchPermissionsLayout = (id) => {
  const [{ data, error, isLoading }, dispatch] = useReducer(reducer, initialState);
  const { get } = useFetchClient();

  useEffect(() => {
    const getData = async () => {
      try {
        dispatch({
          type: 'GET_DATA',
        });

        const {
          data: { data },
        } = await get('/admin/permissions', {
          params: { role: id },
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        // silence is golden
      }
    };

    getData();
  }, [id, get]);

  return { data, error, isLoading };
};

export default useFetchPermissionsLayout;
