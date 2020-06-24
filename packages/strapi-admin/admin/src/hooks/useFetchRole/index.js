import { useReducer, useEffect } from 'react';
import { request } from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';
import { formatPermissionsFromApi } from '../../utils';

const useFetchRole = id => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    fetchRole(id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRole = async roleId => {
    try {
      const [{ data: role }, { data: permissions }] = await Promise.all(
        [`roles/${roleId}`, `roles/${roleId}/permissions`].map(endPoint =>
          request(`/admin/${endPoint}`, { method: 'GET' })
        )
      );

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        role,
        permissions: formatPermissionsFromApi(permissions),
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
