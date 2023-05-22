import { useReducer, useEffect, useCallback } from 'react';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import reducer, { initialState } from './reducer';

/**
 * TODO: refactor this to not use the `useReducer` hook,
 * it's not really necessary. Also use `useQuery`?
 */
const useModels = () => {
  const toggleNotification = useNotification();
  const [state, dispatch] = useReducer(reducer, initialState);

  const { get } = useFetchClient();

  const fetchModels = useCallback(async () => {
    dispatch({
      type: 'GET_MODELS',
    });

    try {
      const [
        {
          data: { data: components },
        },
        {
          data: { data: contentTypes },
        },
      ] = await Promise.all(
        ['components', 'content-types'].map((endPoint) => get(`/content-manager/${endPoint}`))
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
  }, [toggleNotification, get]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    ...state,
    getData: fetchModels,
  };
};

export default useModels;
