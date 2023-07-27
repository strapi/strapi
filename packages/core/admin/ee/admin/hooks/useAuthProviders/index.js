import { useEffect, useReducer } from 'react';

import { useFetchClient, useNotification } from '@strapi/helper-plugin';

import reducer, { initialState } from './reducer';

const useAuthProviders = ({ ssoEnabled }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toggleNotification = useNotification();
  const { get } = useFetchClient();

  useEffect(() => {
    const fetchAuthProviders = async () => {
      try {
        if (!ssoEnabled) {
          dispatch({
            type: 'GET_DATA_SUCCEEDED',
            data: [],
          });

          return;
        }

        const { data } = await get('/admin/providers');

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
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

    fetchAuthProviders();
  }, [get, ssoEnabled, toggleNotification]);

  return state;
};

export default useAuthProviders;
