import { useEffect, useReducer, useRef } from 'react';
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
  const abortCtrlRef = useRef(new AbortController());
  const [{ locales, isLoading }, dispatch] = useReducer(reducer, initialState);

  const refetch = () => fetchLocalesList(dispatch, abortCtrlRef.current.signal);

  useEffect(() => {
    const abortCtrl = abortCtrlRef.current;
    fetchLocalesList(dispatch, abortCtrl.signal);

    return () => abortCtrl.abort();
  }, []);

  return { locales, isLoading, refetch };
};

export default useLocales;
