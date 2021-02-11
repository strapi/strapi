import { useEffect, useReducer, useRef } from 'react';
import { request } from 'strapi-helper-plugin';
import reducer, { initialState } from './reducer';

const fetchDefaultLocalesList = async (dispatch, signal) => {
  try {
    dispatch({
      type: 'GET_DATA',
    });

    const data = await request('/i18n/iso-locales', {
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

const useDefaultLocales = () => {
  const abortCtrlRef = useRef(new AbortController());
  const [{ defaultLocales, isLoading }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const abortCtrl = abortCtrlRef.current;
    fetchDefaultLocalesList(dispatch, abortCtrl.signal);

    return () => abortCtrl.abort();
  }, []);

  return { defaultLocales, isLoading };
};

export default useDefaultLocales;
