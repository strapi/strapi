import { useEffect, useReducer } from 'react';
import reducer, { initialState } from './reducer';

const useRolesList = () => {
  const [{ locales, isLoading }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    setTimeout(() => {
      fetchLocalesList(signal);
    }, 1000);

    return () => abortController.abort();
  }, []);

  const fetchLocalesList = async () => {
    try {
      dispatch({
        type: 'GET_DATA',
      });

      const locales = await Promise.resolve([
        {
          id: 1,
          displayName: 'French',
          code: 'fr-FR',
          isDefault: false,
        },
        {
          id: 2,
          displayName: 'English',
          code: 'en-US',
          isDefault: true,
        },
      ]);
      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data: locales,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return { locales, isLoading };
};

export default useRolesList;
