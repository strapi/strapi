import { useEffect } from 'react';

import { useFetchClient, useNotification } from '@strapi/helper-plugin';

import { GetLocales } from '../../../shared/contracts/locales';
import { RESOLVE_LOCALES } from '../store/constants';
import { useTypedDispatch, useTypedSelector } from '../store/hooks';

const useLocales = () => {
  const dispatch = useTypedDispatch();
  const toggleNotification = useNotification();
  const { isLoading, locales } = useTypedSelector((state) => state.i18n_locales);

  const { get } = useFetchClient();

  useEffect(() => {
    get<GetLocales.Response>('/i18n/locales')
      .then(({ data }) => {
        if (Array.isArray(data)) {
          dispatch({ type: RESOLVE_LOCALES, locales: data });
        }
      })
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

export { useLocales };
