import { useState } from 'react';

import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { AxiosResponse } from 'axios';

import { UpdateLocale } from '../../../shared/contracts/locales';
import { UPDATE_LOCALE } from '../store/constants';
import { useTypedDispatch } from '../store/hooks';
import { getTranslation } from '../utils/getTranslation';

const useEditLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useTypedDispatch();
  const toggleNotification = useNotification();
  const { put } = useFetchClient();

  const modifyLocale = async (
    id: UpdateLocale.Request['params']['id'],
    payload: UpdateLocale.Request['body']
  ) => {
    try {
      setLoading(true);

      const { data } = await put<
        UpdateLocale.Response,
        AxiosResponse<UpdateLocale.Response>,
        UpdateLocale.Request['body']
      >(`/i18n/locales/${id}`, payload);

      if ('id' in data) {
        toggleNotification({
          type: 'success',
          message: { id: getTranslation('Settings.locales.modal.edit.success') },
        });

        dispatch({ type: UPDATE_LOCALE, editedLocale: data });
      } else {
        throw new Error('Invalid response');
      }
    } catch {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    } finally {
      setLoading(false);
    }
  };

  return { isEditing: isLoading, editLocale: modifyLocale };
};

export { useEditLocale };
