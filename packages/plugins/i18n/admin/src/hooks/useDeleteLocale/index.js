import { useState } from 'react';
import { request, useNotification } from '@strapi/helper-plugin';
import { useDispatch } from 'react-redux';
import { getTrad } from '../../utils';
import { DELETE_LOCALE } from '../constants';

const deleteLocale = async (id, toggleNotification) => {
  try {
    const data = await request(`/i18n/locales/${id}`, {
      method: 'DELETE',
    });

    toggleNotification({
      type: 'success',
      message: { id: getTrad('Settings.locales.modal.delete.success') },
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

const useDeleteLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const toggleNotification = useNotification();

  const removeLocale = async (id) => {
    setLoading(true);

    await deleteLocale(id, toggleNotification);

    dispatch({ type: DELETE_LOCALE, id });
    setLoading(false);
  };

  return { isDeleting: isLoading, deleteLocale: removeLocale };
};

export default useDeleteLocale;
