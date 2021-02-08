import { useEffect, useReducer } from 'react';
import { request } from 'strapi-helper-plugin';
import reducer, { initialState } from './reducer';

const fetchLocalesList = async (dispatch, signal) => {
  try {
    dispatch({
      type: 'GET_DATA',
    });

    const data = await request('/i18n/locales', {
      method: 'GET',
      signal,
    });

    dispatch({
      type: 'GET_DATA_SUCCEEDED',
      data,
      // data: [
      //   {
      //     id: 1,
      //     displayName: 'French',
      //     code: 'fr-FR',
      //     isDefault: false,
      //   },
      //   {
      //     id: 2,
      //     displayName: 'English',
      //     code: 'en-US',
      //     isDefault: true,
      //   },
      // ],
    });
  } catch (e) {
    if (e.name === 'AbortError') return;

    strapi.notification.toggle({
      type: 'warning',
      message: { id: 'notification.error' },
    });
  }
};

const useLocales = () => {
  const [{ locales, isLoading }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const abortCtrl = new AbortController();
    fetchLocalesList(dispatch, abortCtrl.signal);

    return () => abortCtrl.abort();
  }, []);

  return { locales, isLoading };
};

export default useLocales;
