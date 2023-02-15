import { useState } from 'react';
import { request, useNotification, useAPIErrorHandler } from '@strapi/helper-plugin';
import { useDispatch } from 'react-redux';
import { getTrad } from '../../utils';
import { UPDATE_LOCALE } from '../constants';

const useEditLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();

  const editLocale = async (id, payload) => {
    try {
      // TODO: use useFetchClient instead
      const data = await request(`/i18n/locales/${id}`, {
        method: 'PUT',
        body: payload,
      });

      toggleNotification({
        type: 'success',
        message: { id: getTrad('Settings.locales.modal.edit.success') },
      });

      return data;
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });

      return null;
    }
  };

  const modifyLocale = async (id, payload) => {
    setLoading(true);

    const editedLocale = await editLocale(id, payload);

    dispatch({ type: UPDATE_LOCALE, editedLocale });
    setLoading(false);
  };

  return { isEditing: isLoading, editLocale: modifyLocale };
};

export default useEditLocale;
