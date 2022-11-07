import { useCallback, useReducer, useEffect, useRef } from 'react';
import { useNotification } from '@strapi/helper-plugin';
import reducer, { initialState } from './reducer';
import axiosInstance from '../../utils/axiosInstance';
import pluginId from '../../pluginId';

const useFetchRole = (id) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toggleNotification = useNotification();
  const isMounted = useRef(null);

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
      console.warn(
        'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
      );
      const {
        data: { role },
      } = await axiosInstance.get(`/${pluginId}/roles/${roleId}`);

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
