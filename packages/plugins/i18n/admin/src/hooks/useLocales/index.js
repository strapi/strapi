import { useEffect } from 'react';
import { request, useNotification } from '@strapi/helper-plugin';
import { useSelector, useDispatch } from 'react-redux';
import { RESOLVE_LOCALES } from '../constants';

const fetchLocalesList = async toggleNotification => {
  try {
    const data = await request('/i18n/locales', {
      method: 'GET',
    });

    return data;
  } catch (e) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return e;
  }
};

const useLocales = () => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const locales = useSelector(state => state.i18n_locales.locales);
  const isLoading = useSelector(state => state.i18n_locales.isLoading);

  useEffect(() => {
    fetchLocalesList(toggleNotification).then(locales =>
      dispatch({ type: RESOLVE_LOCALES, locales })
    );
  }, [dispatch, toggleNotification]);

  return { locales, isLoading };
};

export default useLocales;
