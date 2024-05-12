import * as React from 'react';

import { useAPIErrorHandler, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { AxiosError, type AxiosResponse } from 'axios';
import { useDispatch } from 'react-redux';

import { CreateLocale } from '../../../shared/contracts/locales';
import { ADD_LOCALE } from '../store/constants';
import { getTranslation } from '../utils/getTranslation';

const useAddLocale = () => {
  const [isLoading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const { post } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();

  const persistLocale = async (locale: CreateLocale.Request['body']) => {
    setLoading(true);

    try {
      const { data } = await post<
        CreateLocale.Response,
        AxiosResponse<CreateLocale.Response>,
        CreateLocale.Request['body']
      >('/i18n/locales', locale);

      toggleNotification({
        type: 'success',
        message: { id: getTranslation('Settings.locales.modal.create.success') },
      });

      dispatch({ type: ADD_LOCALE, newLocale: data });
    } catch (e) {
      if (e instanceof AxiosError) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(e),
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }

      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { isAdding: isLoading, addLocale: persistLocale };
};

export { useAddLocale };
