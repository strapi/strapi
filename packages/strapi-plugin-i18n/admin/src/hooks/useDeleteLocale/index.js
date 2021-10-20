import { useState } from 'react';
import { request } from 'strapi-helper-plugin';
import { useDispatch } from 'react-redux';
import { getTrad } from '../../utils';
import { DELETE_LOCALE } from '../constants';

const deleteLocale = async id => {
  try {
    const data = await request(`/i18n/locales/${id}`, {
      method: 'DELETE',
    });

    strapi.notification.toggle({
      type: 'success',
      message: { id: getTrad('Settings.locales.modal.delete.success') },
    });

    return data;
  } catch (e) {
    strapi.notification.toggle({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return e;
  }
};

const useDeleteLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const removeLocale = async id => {
    setLoading(true);

    await deleteLocale(id);

    dispatch({ type: DELETE_LOCALE, id });
    setLoading(false);
  };

  return { isDeleting: isLoading, deleteLocale: removeLocale };
};

export default useDeleteLocale;
