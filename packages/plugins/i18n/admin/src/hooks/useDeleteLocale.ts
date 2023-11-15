import { useState } from 'react';

import { useFetchClient, useNotification } from '@strapi/helper-plugin';

import { DeleteLocale } from '../../../shared/contracts/locales';
import { DELETE_LOCALE } from '../store/constants';
import { useTypedDispatch } from '../store/hooks';
import { getTranslation } from '../utils/getTranslation';

const useDeleteLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useTypedDispatch();
  const toggleNotification = useNotification();

  const { del } = useFetchClient();

  const removeLocale = async (id: DeleteLocale.Request['params']['id']) => {
    try {
      setLoading(true);

      await del<DeleteLocale.Response>(`/i18n/locales/${id}`);

      toggleNotification({
        type: 'success',
        message: { id: getTranslation('Settings.locales.modal.delete.success') },
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

export { useDeleteLocale };
