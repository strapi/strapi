import { useState } from 'react';

import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useDispatch } from 'react-redux';

import { getTrad } from '../../utils';
import { UPDATE_LOCALE } from '../constants';

const useEditLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const { put } = useFetchClient();

  const modifyLocale = async (id, payload) => {
    try {
      setLoading(true);

      const { data } = await put(`/i18n/locales/${id}`, payload);

      toggleNotification({
        type: 'success',
        message: { id: getTrad('Settings.locales.modal.edit.success') },
      });

      dispatch({ type: UPDATE_LOCALE, editedLocale: data });
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

export default useEditLocale;
