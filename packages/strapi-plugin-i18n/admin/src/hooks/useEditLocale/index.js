import { useState } from 'react';
import { getTrad } from '../../utils';

const useEditLocale = () => {
  const [isEditing, setIsEditing] = useState(false);

  const editLocale = localeToEdit => {
    console.log(`About to edit`, localeToEdit);
    setIsEditing(true);

    return new Promise(resolve =>
      setTimeout(() => {
        setIsEditing(false);

        strapi.notification.toggle({
          type: 'success',
          message: { id: getTrad('Settings.locales.modal.edit.success') },
        });

        resolve();
      }, 1000)
    );
  };

  return { isEditing, editLocale };
};

export default useEditLocale;
