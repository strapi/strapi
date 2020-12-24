import { useReducer, useEffect } from 'react';
import { request } from 'strapi-helper-plugin';

import { getRequestUrl } from '../../../../admin/src/utils';
import reducer, { initialState } from './reducer';

const useAuthProviders = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    fetchAuthProviders();
  }, []);

  const fetchAuthProviders = async () => {
    try {
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
      strapi.notification.toggle({
        type: 'warning',
        message: { id: 'notification.error' },
        centered: true,
      });
    }
  };

  return state;
};

export default useAuthProviders;
