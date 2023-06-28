import { useCallback, useEffect, useReducer } from 'react';

import { useFetchClient, useNotification } from '@strapi/helper-plugin';

import reducer, { initialState } from './reducer';

const useFetchRole = (id) => {
  const toggleNotification = useNotification();
  const [state, dispatch] = useReducer(reducer, initialState);

  const { get } = useFetchClient();

  useEffect(() => {
    if (id) {
      const fetchRole = async (roleId) => {
        try {
          const [
            {
              data: { data: role },
            },
            {
              data: { data: permissions },
            },
          ] = await Promise.all(
            [`roles/${roleId}`, `roles/${roleId}/permissions`].map((endPoint) =>
              get(`/admin/${endPoint}`)
            )
          );

          dispatch({
            type: 'GET_DATA_SUCCEEDED',
            role,
            permissions,
          });
        } catch (err) {
          console.error(err);

          dispatch({
            type: 'GET_DATA_ERROR',
          });
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        }
      };

      fetchRole(id);
    } else {
      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        role: {},
        permissions: [],
      });
    }
  }, [get, id, toggleNotification]);

  const handleSubmitSucceeded = useCallback((data) => {
    dispatch({
      type: 'ON_SUBMIT_SUCCEEDED',
      ...data,
    });
  }, []);

  return { ...state, onSubmitSucceeded: handleSubmitSucceeded };
};

export default useFetchRole;
