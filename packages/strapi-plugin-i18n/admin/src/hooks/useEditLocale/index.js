import { useState } from 'react';
import { request } from 'strapi-helper-plugin';
import { getTrad } from '../../utils';

const useEditLocale = () => {
  const [isEditing, setIsEditing] = useState(false);

  const editLocale = async (id, name) => {
    try {
      setIsEditing(true);

      await request(`/i18n/locales/${id}`, {
        method: 'PUT',
        body: {
          name,
        },
      });

      setIsEditing(false);

      strapi.notification.toggle({
        type: 'success',
        message: { id: getTrad('Settings.locales.modal.edit.success') },
      });
    } catch {
      strapi.notification.toggle({
        type: 'warning',
        message: { id: 'notification.error' },
      });

      setIsEditing(false);
    }
  };

  return { isEditing, editLocale };
};

export default useEditLocale;
