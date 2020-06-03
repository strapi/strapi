import { useReducer, useEffect } from 'react';
import { request } from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';

const Permissions = () => {
  const [{ collectionTypes, singleTypes }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    fetchContentTypes();
  }, []);

  const fetchContentTypes = async () => {
    try {
      const { data } = await request('/content-manager/content-types', {
        method: 'GET',
      });

      dispatch({
        type: 'GET_CONTENT_TYPES_SUCCEDED',
        data,
      });
    } catch (err) {
      dispatch({
        type: 'GET_CONTENT_TYPES_ERROR',
      });
      strapi.notification.error('notification.error');
    }
  };

  return {
    singleTypes,
    collectionTypes,
  };
};

export default Permissions;
