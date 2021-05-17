import { useState } from 'react';
import { request, useNotification } from '@strapi/helper-plugin';
import { useDispatch } from 'react-redux';
import { getTrad } from '../../utils';
import { UPDATE_LOCALE } from '../constants';

const editLocale = async (id, payload, toggleNotification) => {
  try {
    const data = await request(`/i18n/locales/${id}`, {
      method: 'PUT',
      body: payload,
    });

    toggleNotification({
      type: 'success',
      message: { id: getTrad('Settings.locales.modal.edit.success') },
    });

    return data;
  } catch {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return null;
  }
};

const useEditLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const toggleNotification = useNotification();

  const modifyLocale = async (id, payload) => {
    setLoading(true);

    const editedLocale = await editLocale(id, payload, toggleNotification);

    dispatch({ type: UPDATE_LOCALE, editedLocale });
    setLoading(false);
  };

  return { isEditing: isLoading, editLocale: modifyLocale };
};

export default useEditLocale;
