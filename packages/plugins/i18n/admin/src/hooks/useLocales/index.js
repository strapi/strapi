import { useEffect } from 'react';

import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useDispatch, useSelector } from 'react-redux';

import { RESOLVE_LOCALES } from '../constants';

const useLocales = () => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const locales = useSelector((state) => state.i18n_locales.locales);
  const isLoading = useSelector((state) => state.i18n_locales.isLoading);

  const { get } = useFetchClient();

  useEffect(() => {
    get('/i18n/locales')
      .then(({ data }) => dispatch({ type: RESOLVE_LOCALES, locales: data }))
      .catch((err) => {
        /**
         * TODO: this should be refactored.
         *
         * In fact it should be refactored to use react-query?
         */
        if ('code' in err && err?.code === 'ERR_CANCELED') {
          return;
        }

        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      });
  }, [dispatch, get, toggleNotification]);

  return { locales, isLoading };
};

export default useLocales;
