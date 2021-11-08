import { useReducer, useEffect } from 'react';
import { request, useNotification } from '@strapi/helper-plugin';

import { getRequestUrl } from '../../../../admin/src/utils';
import reducer, { initialState } from './reducer';

const useAuthProviders = ({ ssoEnabled }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toggleNotification = useNotification();

  useEffect(() => {
    fetchAuthProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAuthProviders = async () => {
    try {
      if (!ssoEnabled) {
        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: [],
        });

        return;
      }

      const requestUrl = getRequestUrl('providers');
      const data = await request(requestUrl, { method: 'GET' });

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

  return state;
};

export default useAuthProviders;
