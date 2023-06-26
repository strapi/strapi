import { useCallback, useEffect, useReducer, useRef } from 'react';

import { useFetchClient, useNotification } from '@strapi/helper-plugin';

import pluginId from '../../pluginId';

import reducer, { initialState } from './reducer';

const useFetchRole = (id) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toggleNotification = useNotification();
  const isMounted = useRef(null);
  const { get } = useFetchClient();

  useEffect(() => {
    isMounted.current = true;

    if (id) {
      fetchRole(id);
    } else {
      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        role: {},
      });
    }

    return () => (isMounted.current = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRole = async (roleId) => {
    try {
      const {
        data: { role },
      } = await get(`/${pluginId}/roles/${roleId}`);

      // Prevent updating state on an unmounted component
      if (isMounted.current) {
        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          role,
        });
      }
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

  const handleSubmitSucceeded = useCallback((data) => {
    dispatch({
      type: 'ON_SUBMIT_SUCCEEDED',
      ...data,
    });
  }, []);

  return { ...state, onSubmitSucceeded: handleSubmitSucceeded };
};

export default useFetchRole;
