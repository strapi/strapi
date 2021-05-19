import { useReducer, useEffect } from 'react';
import { request, useNotification } from '@strapi/helper-plugin';
import reducer, { initialState } from './reducer';

const useModels = () => {
  const toggleNotification = useNotification();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchModels = async () => {
    dispatch({
      type: 'GET_MODELS',
    });

    try {
      const [{ data: components }, { data: contentTypes }] = await Promise.all(
        ['components', 'content-types'].map(endPoint =>
          request(`/content-manager/${endPoint}`, { method: 'GET' })
        )
      );

      dispatch({
        type: 'GET_MODELS_SUCCEDED',
        contentTypes,
        components,
      });
    } catch (err) {
      dispatch({
        type: 'GET_MODELS_ERROR',
      });
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }
  };

  return {
    ...state,
    getData: fetchModels,
  };
};

export default useModels;
