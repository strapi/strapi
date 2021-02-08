import { useState } from 'react';
import { getTrad } from '../../utils';

const useDeleteLocale = () => {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteLocale = localeToDelete => {
    console.log(`About to delete`, localeToDelete);
    setIsDeleting(true);

    return new Promise(resolve =>
      setTimeout(() => {
        setIsDeleting(false);

        strapi.notification.toggle({
          type: 'success',
          message: { id: getTrad('Settings.locales.modal.delete.success') },
        });

        resolve();
      }, 1000)
    );
  };

  return { isDeleting, deleteLocale };
};

export default useDeleteLocale;
