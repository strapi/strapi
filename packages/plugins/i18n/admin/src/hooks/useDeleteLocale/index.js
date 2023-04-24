import { useState } from 'react';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useDispatch } from 'react-redux';
import { getTrad } from '../../utils';
import { DELETE_LOCALE } from '../constants';

const useDeleteLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const toggleNotification = useNotification();

  const { del } = useFetchClient();

  const removeLocale = async (id) => {
    try {
      setLoading(true);

      await del(`/i18n/locales/${id}`);

      toggleNotification({
        type: 'success',
        message: { id: getTrad('Settings.locales.modal.delete.success') },
      });

      dispatch({ type: DELETE_LOCALE, id });
    } catch {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    } finally {
      setLoading(false);
    }
  };

  return { isDeleting: isLoading, deleteLocale: removeLocale };
};

export default useDeleteLocale;
