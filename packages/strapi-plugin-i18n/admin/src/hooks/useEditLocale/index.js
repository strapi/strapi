import { useState } from 'react';
import { request } from 'strapi-helper-plugin';
import { useDispatch } from 'react-redux';
import { getTrad } from '../../utils';
import { UPDATE_LOCALE } from '../constants';

const editLocale = async (id, payload) => {
  try {
    const data = await request(`/i18n/locales/${id}`, {
      method: 'PUT',
      body: payload,
    });

    strapi.notification.toggle({
      type: 'success',
      message: { id: getTrad('Settings.locales.modal.edit.success') },
    });

    return data;
  } catch {
    strapi.notification.toggle({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return null;
  }
};

const useEditLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const modifyLocale = async (id, payload) => {
    setLoading(true);

    const editedLocale = await editLocale(id, payload);

    dispatch({ type: UPDATE_LOCALE, editedLocale });
    setLoading(false);
  };

  return { isEditing: isLoading, editLocale: modifyLocale };
};

export default useEditLocale;
